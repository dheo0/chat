const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Groq = require('groq-sdk');
require('dotenv').config();

if (!process.env.GROQ_API_KEY) {
  console.error('오류: GROQ_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 사용자별 채팅 히스토리 저장
const chatHistories = new Map();

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

io.on('connection', (socket) => {
  console.log(`사용자 연결: ${socket.id}`);
  chatHistories.set(socket.id, []);

  socket.on('message', async (text) => {
    const history = chatHistories.get(socket.id);
    history.push({ role: 'user', content: text });

    try {
      socket.emit('typing', true);

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const reply = response.choices[0].message.content;
      history.push({ role: 'assistant', content: reply });

      socket.emit('typing', false);
      socket.emit('reply', reply);
    } catch (error) {
      console.error('Groq API 오류:', error.message);
      console.error('상세:', JSON.stringify({ status: error.status, code: error.error?.code }));
      socket.emit('typing', false);

      let msg = '상담사 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      if (error.status === 401) {
        msg = 'API 키 인증에 실패했습니다. 서버 설정을 확인해주세요.';
      } else if (error.status === 429) {
        msg = 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
        msg = 'AI 서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
      }

      socket.emit('error', msg);
    }
  });

  socket.on('reset', () => {
    chatHistories.set(socket.id, []);
    socket.emit('resetDone');
  });

  socket.on('disconnect', () => {
    console.log(`사용자 연결 종료: ${socket.id}`);
    chatHistories.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
