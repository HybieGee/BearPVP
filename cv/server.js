const express = require('express');
const cors = require('cors');
const { TwitchFrameProcessor } = require('./frameProcessor');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const processor = new TwitchFrameProcessor({
  confidenceThreshold: parseFloat(process.env.CV_CONFIDENCE_THRESHOLD) || 0.9,
  consecutiveFrameRequirement: parseInt(process.env.CONSECUTIVE_FRAME_REQUIREMENT) || 6
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.post('/process', async (req, res) => {
  try {
    const { channel, roundId } = req.body;

    if (!channel || !roundId) {
      return res.status(400).json({
        error: 'Missing required parameters: channel, roundId'
      });
    }

    console.log(`Processing frames for channel: ${channel}, round: ${roundId}`);

    const result = await processor.processChannel(channel, roundId);

    res.json(result);

  } catch (error) {
    console.error('Frame processing error:', error);
    res.status(500).json({
      error: 'Frame processing failed',
      message: error.message
    });
  }
});

app.post('/configure', (req, res) => {
  try {
    const { confidenceThreshold, consecutiveFrameRequirement, boundingBox } = req.body;

    if (confidenceThreshold !== undefined) {
      processor.config.confidenceThreshold = parseFloat(confidenceThreshold);
    }

    if (consecutiveFrameRequirement !== undefined) {
      processor.config.consecutiveFrameRequirement = parseInt(consecutiveFrameRequirement);
    }

    if (boundingBox) {
      processor.config.boundingBox = boundingBox;
    }

    console.log('Configuration updated:', processor.config);

    res.json({
      success: true,
      config: processor.config
    });

  } catch (error) {
    console.error('Configuration error:', error);
    res.status(500).json({
      error: 'Configuration update failed',
      message: error.message
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    config: processor.config,
    stats: processor.getStats()
  });
});

app.listen(port, () => {
  console.log(`CV service running on port ${port}`);
  console.log('Configuration:', processor.config);
});