// 全局变量
let isProcessing = false;
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 消息历史
let messageHistory = [];

// 添加消息到聊天界面
function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `<p>${content}</p>`;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 处理用户输入
async function handleUserInput() {
    const content = userInput.value.trim();
    if (!content || isProcessing) return;

    // 禁用输入和发送按钮
    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    // 显示用户消息
    addMessage(content, 'user');
    messageHistory.push({ role: 'user', content });

    try {
        // 创建EventSource连接
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messageHistory
            })
        });

        // 创建新的消息容器
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        const messageParagraph = document.createElement('p');
        assistantMessageDiv.appendChild(messageParagraph);
        chatContainer.appendChild(assistantMessageDiv);

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '' || !line.startsWith('data: ')) continue;
                const data = line.slice(6);
                assistantResponse += data;
                messageParagraph.textContent = assistantResponse;
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }

        // 将助手回复添加到历史记录
        messageHistory.push({ role: 'assistant', content: assistantResponse });

    } catch (error) {
        console.error('请求错误:', error);
        addMessage('抱歉，发生了一些错误，请稍后重试。', 'system');
    } finally {
        // 重置状态
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.value = '';
        userInput.focus();
    }
}

// 事件监听器
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
    }
});

// 自动聚焦输入框
userInput.focus();