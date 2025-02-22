require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// DeepSeek API配置
const DEEPSEEK_API_KEY = '57e4e2ff-7e08-432a-b0bd-afe6061e32fc';
const DEEPSEEK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求
app.post('/api/chat', async (req, res) => {
    try {
        let response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的Life Coach，擅长通过对话帮助人们发现自己的潜力，解决成长中的困惑，并提供实用的建议和指导。你的回答应该富有洞察力、同理心和建设性，帮助用户制定可行的成长计划。'
                    },
                    ...req.body.messages
                ],
                temperature: 0.6,
                stream: true
            }),
            timeout: 60000 // 60秒超时
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        // 设置SSE响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // 处理流式响应
        response = await response.text();
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;
            
            try {
                const data = JSON.parse(line.slice(6));
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                    res.write(`data: ${data.choices[0].delta.content}\n\n`);
                }
            } catch (e) {
                console.error('解析响应数据出错:', e);
                continue;
            }
        }
        res.end();
    } catch (error) {
        console.error('API请求错误:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});