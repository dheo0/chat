const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 사용자별 대화 기록 저장
const conversationHistory = new Map();

const SYSTEM_PROMPT = `당신은 따뜻하고 전문적인 심리 상담사입니다.
사용자의 이야기를 경청하고, 공감하며, 필요한 경우 적절한 조언을 제공합니다.

상담 원칙:
- 판단하지 않고 공감하는 자세를 유지하세요
- 사용자가 자신의 감정을 충분히 표현할 수 있도록 도와주세요
- 구체적이고 실용적인 조언을 제공하세요
- 위기 상황(자해, 자살 위험 등)이 감지되면 즉시 전문 기관(자살예방상담전화 1393)을 안내하세요
- 한국어로 대화하세요`;

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`사용자 연결: ${socket.id}`);
  conversationHistory.set(socket.id, []);

  socket.on('message', async (text) => {
    const history = conversationHistory.get(socket.id) || [];
    history.push({ role: 'user', content: text });

    try {
      socket.emit('typing', true);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: history,
      });

      const reply = response.content[0].text;
      history.push({ role: 'assistant', content: reply });
      conversationHistory.set(socket.id, history);

      socket.emit('typing', false);
      socket.emit('reply', reply);
    } catch (error) {
      console.error('Claude API 오류:', error.message);
      socket.emit('typing', false);
      socket.emit('error', '상담사 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  });

  socket.on('reset', () => {
    conversationHistory.set(socket.id, []);
    socket.emit('resetDone');
  });

  socket.on('disconnect', () => {
    console.log(`사용자 연결 종료: ${socket.id}`);
    conversationHistory.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
