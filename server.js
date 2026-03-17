const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 사용자별 채팅 세션 저장
const chatSessions = new Map();

const SYSTEM_PROMPT = `당신은 전문적인 법률 상담사입니다.
오직 법률과 관련된 질문에만 답변하며, 사용자가 법적 상황을 이해하고 적절한 조치를 취할 수 있도록 돕습니다.

상담 원칙:
- 민사, 형사, 노동, 가족, 계약, 부동산, 행정 등 법률 전반에 대해 안내합니다
- 법률 용어는 이해하기 쉽게 설명합니다
- 구체적인 사례에 대해서는 관련 법조문과 판례를 바탕으로 설명합니다
- 실제 소송이나 계약서 작성 등은 반드시 공인 변호사와 상담하도록 안내합니다
- 법률과 무관한 질문(심리 상담, 의료, 일상 대화 등)이 들어오면 "저는 법률 상담만 제공합니다. 법률 관련 질문을 해주세요."라고 정중히 안내합니다
- 한국 법률을 기준으로 답변하되, 외국 법률 질문은 해당 국가의 법률임을 명시합니다
- 한국어로 대화하세요`;

app.use(express.static('public'));

function createChatSession() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });
  return model.startChat({ history: [] });
}

io.on('connection', (socket) => {
  console.log(`사용자 연결: ${socket.id}`);
  chatSessions.set(socket.id, createChatSession());

  socket.on('message', async (text) => {
    const chat = chatSessions.get(socket.id);

    try {
      socket.emit('typing', true);

      const result = await chat.sendMessage(text);
      const reply = result.response.text();

      socket.emit('typing', false);
      socket.emit('reply', reply);
    } catch (error) {
      console.error('Gemini API 오류:', error.message);
      socket.emit('typing', false);
      socket.emit('error', '상담사 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  });

  socket.on('reset', () => {
    chatSessions.set(socket.id, createChatSession());
    socket.emit('resetDone');
  });

  socket.on('disconnect', () => {
    console.log(`사용자 연결 종료: ${socket.id}`);
    chatSessions.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
