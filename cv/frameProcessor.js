const axios = require('axios');
const sharp = require('sharp');
const { spawn } = require('child_process');

class TwitchFrameProcessor {
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold || 0.8,
      consecutiveFrameRequirement: config.consecutiveFrameRequirement || 4,
      // Top-right corner for score
      scoreBoundingBox: config.scoreBoundingBox || { x: 0.7, y: 0.05, width: 0.25, height: 0.15 },
      // Center area for winner text
      winnerBoundingBox: config.winnerBoundingBox || { x: 0.3, y: 0.4, width: 0.4, height: 0.2 },
      sampleRate: config.sampleRate || 1500,
      maxProcessingTime: config.maxProcessingTime || 300000
    };

    this.frameHistory = [];
    this.consecutiveReadings = [];
    this.lastKnownScore = { purple: 0, yellow: 0 };
    this.stats = {
      framesProcessed: 0,
      scoresDetected: 0,
      winnersDetected: 0,
      confidenceSum: 0,
      lastProcessed: null
    };
  }

  async processChannel(channel, roundId) {
    const startTime = Date.now();
    let currentScore = { purple: 0, yellow: 0 };
    let winnerDetected = null;

    try {
      console.log(`Starting frame processing for ${channel}`);

      // For live streams, we'll capture directly from the embed
      const streamUrl = `https://www.twitch.tv/${channel}`;
      console.log(`Monitoring stream: ${streamUrl}`);

      while (Date.now() - startTime < this.config.maxProcessingTime) {
        try {
          // Capture frame using streamlink or direct HLS
          const frame = await this.captureStreamFrame(channel);
          if (!frame) {
            await this.sleep(this.config.sampleRate);
            continue;
          }

          this.stats.framesProcessed++;
          this.stats.lastProcessed = Date.now();

          // Check for winner text first (more definitive)
          const winnerText = await this.detectWinnerText(frame);
          if (winnerText) {
            console.log(`Winner text detected: ${winnerText}`);
            this.stats.winnersDetected++;

            // Determine winner from text
            if (winnerText.toLowerCase().includes('purple')) {
              winnerDetected = 'purple';
            } else if (winnerText.toLowerCase().includes('yellow')) {
              winnerDetected = 'yellow';
            }

            if (winnerDetected) {
              // Get final score from top-right
              const finalScore = await this.detectScore(frame);
              if (finalScore) {
                currentScore = finalScore;
              } else {
                // Use last known score and increment winner
                currentScore = { ...this.lastKnownScore };
                currentScore[winnerDetected] = Math.max(3, currentScore[winnerDetected] + 1);
              }

              console.log(`WINNER CONFIRMED: ${winnerDetected.toUpperCase()} wins!`);
              console.log(`Final score: Purple ${currentScore.purple} - Yellow ${currentScore.yellow}`);

              return {
                winner: winnerDetected,
                score: currentScore,
                confidence: 0.95,
                roundId,
                completedAt: Date.now(),
                detectionMethod: 'winner_text'
              };
            }
          }

          // Check score in top-right corner
          const detectedScore = await this.detectScore(frame);
          if (detectedScore) {
            this.stats.scoresDetected++;
            this.lastKnownScore = detectedScore;
            currentScore = detectedScore;

            console.log(`Score: Purple ${detectedScore.purple} - Yellow ${detectedScore.yellow}`);

            // Check if someone reached 3
            if (detectedScore.purple >= 3) {
              this.consecutiveReadings.push({ winner: 'purple', score: detectedScore });
            } else if (detectedScore.yellow >= 3) {
              this.consecutiveReadings.push({ winner: 'yellow', score: detectedScore });
            } else {
              this.consecutiveReadings = [];
            }

            // Confirm winner with consecutive readings
            if (this.consecutiveReadings.length >= this.config.consecutiveFrameRequirement) {
              const confirmedWinner = this.consecutiveReadings[0].winner;
              const confirmedScore = this.consecutiveReadings[0].score;

              console.log(`WINNER CONFIRMED (by score): ${confirmedWinner.toUpperCase()} wins!`);
              return {
                winner: confirmedWinner,
                score: confirmedScore,
                confidence: 0.9,
                roundId,
                completedAt: Date.now(),
                detectionMethod: 'score_tracking'
              };
            }
          }

          await this.sleep(this.config.sampleRate);

        } catch (frameError) {
          console.error('Frame processing error:', frameError);
          await this.sleep(this.config.sampleRate);
        }
      }

      return {
        status: 'timeout',
        currentScore,
        roundId,
        message: 'Processing timeout reached without conclusive result'
      };

    } catch (error) {
      console.error('Channel processing error:', error);
      return {
        status: 'error',
        error: error.message,
        roundId
      };
    }
  }

  async captureStreamFrame(channel) {
    return new Promise((resolve) => {
      // Use streamlink to get frame from Twitch
      const streamlink = spawn('streamlink', [
        '--player-external-http',
        '--player-external-http-port', '0',
        `twitch.tv/${channel}`,
        'best',
        '--stdout'
      ]);

      // Alternative: Use ffmpeg directly with Twitch HLS
      const ffmpeg = spawn('ffmpeg', [
        '-i', `https://www.twitch.tv/${channel}`,
        '-vframes', '1',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-loglevel', 'quiet',
        '-'
      ]);

      const chunks = [];

      ffmpeg.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      ffmpeg.on('close', (code) => {
        if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(null);
        }
      });

      // Timeout
      setTimeout(() => {
        ffmpeg.kill();
        streamlink.kill();
        resolve(null);
      }, 5000);
    });
  }

  async detectWinnerText(frameBuffer) {
    try {
      const image = sharp(frameBuffer);
      const metadata = await image.metadata();

      // Extract center area where winner text appears
      const box = this.config.winnerBoundingBox;
      const cropBox = {
        left: Math.floor(metadata.width * box.x),
        top: Math.floor(metadata.height * box.y),
        width: Math.floor(metadata.width * box.width),
        height: Math.floor(metadata.height * box.height)
      };

      const croppedImage = await image
        .extract(cropBox)
        .greyscale()
        .threshold(200) // White text
        .toBuffer();

      // Use OCR to detect text
      const text = await this.performOCR(croppedImage);

      if (text && (text.toLowerCase().includes('wins') ||
                   text.toLowerCase().includes('winner') ||
                   text.toLowerCase().includes('victory'))) {
        return text;
      }

      return null;

    } catch (error) {
      console.error('Winner text detection error:', error);
      return null;
    }
  }

  async detectScore(frameBuffer) {
    try {
      const image = sharp(frameBuffer);
      const metadata = await image.metadata();

      // Extract top-right corner for score
      const box = this.config.scoreBoundingBox;
      const cropBox = {
        left: Math.floor(metadata.width * box.x),
        top: Math.floor(metadata.height * box.y),
        width: Math.floor(metadata.width * box.width),
        height: Math.floor(metadata.height * box.height)
      };

      const croppedImage = await image
        .extract(cropBox)
        .greyscale()
        .threshold(200) // White text/numbers
        .toBuffer();

      // Use OCR to detect score numbers
      const text = await this.performOCR(croppedImage);

      if (text) {
        // Look for pattern like "2-1" or "3 - 0" or "Purple 2 Yellow 1"
        const scorePattern = /(\d+)\s*[-–]\s*(\d+)/;
        const match = text.match(scorePattern);

        if (match) {
          // Assume left number is purple, right is yellow
          return {
            purple: parseInt(match[1]),
            yellow: parseInt(match[2])
          };
        }

        // Alternative pattern
        const altPattern = /purple.*?(\d+).*?yellow.*?(\d+)/i;
        const altMatch = text.match(altPattern);

        if (altMatch) {
          return {
            purple: parseInt(altMatch[1]),
            yellow: parseInt(altMatch[2])
          };
        }
      }

      return null;

    } catch (error) {
      console.error('Score detection error:', error);
      return null;
    }
  }

  async performOCR(imageBuffer) {
    return new Promise((resolve) => {
      // Using Tesseract OCR via Python
      const python = spawn('python3', ['-c', `
import sys
import pytesseract
from PIL import Image
import io
import numpy as np

try:
    # Read image from stdin
    image_data = sys.stdin.buffer.read()

    # Convert to PIL Image
    image = Image.open(io.BytesIO(image_data))

    # Perform OCR
    text = pytesseract.image_to_string(image, config='--psm 7')

    print(text.strip())
except Exception as e:
    print("")
      `]);

      python.stdin.write(imageBuffer);
      python.stdin.end();

      let output = '';
      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', () => {
        resolve(output.trim());
      });

      // Timeout
      setTimeout(() => {
        python.kill();
        resolve(null);
      }, 3000);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      averageConfidence: this.stats.scoresDetected > 0 ?
        this.stats.confidenceSum / this.stats.scoresDetected : 0,
      lastKnownScore: this.lastKnownScore
    };
  }
}

module.exports = { TwitchFrameProcessor };