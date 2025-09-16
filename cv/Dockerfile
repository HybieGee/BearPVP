FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    tesseract-ocr \
    python3-opencv \
    ffmpeg \
    streamlink \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install pytesseract pillow numpy opencv-python

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]