// ============ НАВИГАЦИЯ ============
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Закрыть мобильное меню при клике на ссылку
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            navMenu.classList.remove('active');
        }
    });
});

// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ============ ГРАФИК ТАЯНИЯ ============
const ctx = document.getElementById('meltingChart');
if (ctx) {
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Май', 'Июнь', 'Июль', 'Август', 'Сентябрь'],
            datasets: [
                {
                    label: 'Без защиты (см таяния)',
                    data: [12, 18, 22, 20, 15],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'С геотекстилем (см таяния)',
                    data: [5, 7, 8, 7, 5],
                    borderColor: '#0066FF',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Таяние (см/день)'
                    }
                }
            }
        }
    });
}

// ============ AI АНАЛИЗАТОР ИЗОБРАЖЕНИЙ ============
const glacierImageInput = document.getElementById('glacierImageInput');
const cameraInput = document.getElementById('cameraInput');
const uploadArea = document.getElementById('uploadArea');
const aiResult = document.getElementById('aiResult');
const uploadedImage = document.getElementById('uploadedImage');
const analysisResult = document.getElementById('analysisResult');

// Обработка загрузки файла
if (glacierImageInput) {
    glacierImageInput.addEventListener('change', handleImageUpload);
}

if (cameraInput) {
    cameraInput.addEventListener('change', handleImageUpload);
}

// Drag and drop
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#00C9FF';
        uploadArea.style.background = '#FFFFFF';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#0066FF';
        uploadArea.style.background = '#E3F2FD';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#0066FF';
        uploadArea.style.background = '#E3F2FD';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImage(file);
        }
    });
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

async function processImage(file) {
    // Показать результат
    aiResult.style.display = 'grid';
    uploadedImage.src = URL.createObjectURL(file);
    
    // Показать загрузку
    analysisResult.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>AI анализирует изображение...</p>
        </div>
    `;
    
    // Конвертировать в base64
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        await analyzeGlacierImage(base64Data);
    };
    reader.readAsDataURL(file);
}

async function analyzeGlacierImage(base64Data) {
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/jpeg",
                                    data: base64Data
                                }
                            },
                            {
                                type: "text",
                                text: `Проанализируй это изображение и ответь ТОЛЬКО в формате JSON без каких-либо дополнительных слов или markdown форматирования:

{
  "isGlacier": true/false,
  "glacierName": "название или 'Неизвестный ледник'",
  "condition": "отличное/хорошее/удовлетворительное/критическое",
  "meltingRate": "низкая/средняя/высокая/критическая",
  "needsGeotextile": true/false,
  "geotextileArea": "площадь в кв.м или 'не требуется'",
  "riskLevel": "низкий/средний/высокий/критический",
  "recommendations": "краткие рекомендации на русском",
  "confidence": число от 0 до 100
}

Если на изображении НЕТ ледника, верни: {"isGlacier": false, "message": "На изображении не обнаружен ледник"}`
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        const textContent = data.content.find(item => item.type === "text")?.text || "";
        
        // Извлечь JSON
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Не удалось получить корректный ответ от AI");
        }
        
        const result = JSON.parse(jsonMatch[0]);
        displayAnalysisResult(result);
    } catch (err) {
        console.error("Analysis error:", err);
        analysisResult.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #EF4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p><strong>Ошибка при анализе</strong></p>
                <p>Попробуйте еще раз или загрузите другое изображение.</p>
            </div>
        `;
    }
}

function displayAnalysisResult(result) {
    if (!result.isGlacier) {
        analysisResult.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <i class="fas fa-times-circle" style="font-size: 4rem; color: #F59E0B; margin-bottom: 1rem;"></i>
                <h3 style="color: #F59E0B; margin-bottom: 1rem;">Ледник не обнаружен</h3>
                <p style="color: #4A5568;">${result.message || 'На изображении не обнаружен ледник. Пожалуйста, загрузите фотографию ледника.'}</p>
            </div>
        `;
        return;
    }

    const riskColors = {
        'низкий': '#10B981',
        'средний': '#F59E0B',
        'высокий': '#F97316',
        'критический': '#EF4444'
    };

    const conditionColors = {
        'отличное': '#10B981',
        'хорошее': '#0066FF',
        'удовлетворительное': '#F59E0B',
        'критическое': '#EF4444'
    };

    analysisResult.innerHTML = `
        <div style="padding: 2rem;">
            <h3 style="color: #0066FF; margin-bottom: 2rem; font-size: 1.5rem;">
                <i class="fas fa-chart-line"></i> Результаты анализа
            </h3>
            
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-radius: 10px;">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0.5rem;">Ледник</p>
                <p style="color: #1A202C; font-size: 1.3rem; font-weight: bold;">${result.glacierName}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-radius: 10px;">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0.5rem;">Состояние</p>
                <p style="color: ${conditionColors[result.condition]}; font-size: 1.2rem; font-weight: bold; text-transform: uppercase;">
                    ${result.condition}
                </p>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-radius: 10px;">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0.5rem;">Скорость таяния</p>
                <p style="color: #1A202C; font-size: 1.1rem; font-weight: 600;">${result.meltingRate}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: ${riskColors[result.riskLevel]}22; border: 2px solid ${riskColors[result.riskLevel]}; border-radius: 10px;">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0.5rem;">Уровень риска</p>
                <p style="color: ${riskColors[result.riskLevel]}; font-size: 1.2rem; font-weight: bold; text-transform: uppercase;">
                    ${result.riskLevel}
                </p>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: ${result.needsGeotextile ? '#FFF7ED' : '#F0FDF4'}; border: 2px solid ${result.needsGeotextile ? '#F59E0B' : '#10B981'}; border-radius: 10px;">
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <i class="fas ${result.needsGeotextile ? 'fa-exclamation-triangle' : 'fa-check-circle'}" 
                       style="font-size: 2rem; color: ${result.needsGeotextile ? '#F59E0B' : '#10B981'};"></i>
                    <div>
                        <h4 style="color: ${result.needsGeotextile ? '#92400E' : '#065F46'}; margin-bottom: 0.5rem; font-size: 1.2rem;">
                            ${result.needsGeotextile ? 'Требуется геотекстиль' : 'Геотекстиль не требуется'}
                        </h4>
                        ${result.needsGeotextile ? `
                            <p style="color: #78350F;">
                                Рекомендуемая площадь: <strong>${result.geotextileArea}</strong>
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: white; border-radius: 10px; border-left: 4px solid #0066FF;">
                <h4 style="color: #0066FF; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-lightbulb"></i> Рекомендации
                </h4>
                <p style="color: #4A5568; line-height: 1.6;">${result.recommendations}</p>
            </div>
            
            <div style="padding: 1rem; background: white; border-radius: 10px;">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0.5rem;">Точность анализа</p>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="flex: 1; background: #E3F2FD; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${result.confidence}%; height: 100%; background: linear-gradient(135deg, #0066FF 0%, #00C9FF 100%); transition: width 1s ease;"></div>
                    </div>
                    <span style="font-weight: bold; color: #0066FF; font-size: 1.1rem;">${result.confidence}%</span>
                </div>
            </div>
        </div>
    `;
}

// ============ AI ЧАТ-ПОМОЩНИК ============
const chatFab = document.getElementById('chatFab');
const chatWidget = document.getElementById('aiChatWidget');
const chatToggle = document.getElementById('chatToggle');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');

// Открыть чат
if (chatFab) {
    chatFab.addEventListener('click', () => {
        chatWidget.style.display = 'flex';
        chatWidget.classList.add('active');
        chatFab.style.display = 'none';
        console.log('Chat opened');
    });
}

// Закрыть чат
if (chatToggle) {
    chatToggle.addEventListener('click', () => {
        chatWidget.classList.remove('active');
        setTimeout(() => {
            chatWidget.style.display = 'none';
            chatFab.style.display = 'flex';
        }, 300);
        console.log('Chat closed');
    });
}

if (chatSend) {
    chatSend.addEventListener('click', sendChatMessage);
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function askQuestion(question) {
    chatInput.value = question;
    sendChatMessage();
}

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Добавить сообщение пользователя
    addChatMessage(message, 'user');
    chatInput.value = '';

    // Показать индикатор загрузки
    const loadingId = addChatMessage('Думаю...', 'bot', true);

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 500,
                messages: [
                    {
                        role: "user",
                        content: `Ты AI-помощник проекта "Спасение Ледников Алматы". Отвечай кратко и понятно на русском языке.
                        
Контекст проекта:
- Ледники Заилийского Алатау теряют 30% массы за 50 лет
- Мы используем геотекстиль (белое полотно) для защиты ледников
- Геотекстиль отражает 85-90% солнечного излучения
- Снижает таяние на 60-70%
- Покрыто 5000 м² на леднике Туюксу
- Проект важен для водоснабжения 2 млн человек в Алматы

Вопрос пользователя: ${message}`
                    }
                ]
            })
        });

        const data = await response.json();
        const botMessage = data.content.find(item => item.type === "text")?.text || "Извините, не смог обработать ваш запрос.";
        
        // Удалить индикатор загрузки и добавить ответ
        document.getElementById(loadingId).remove();
        addChatMessage(botMessage, 'bot');
    } catch (err) {
        console.error("Chat error:", err);
        document.getElementById(loadingId).remove();
        addChatMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'bot');
    }
}

function addChatMessage(text, sender, isLoading = false) {
    const messageId = 'msg-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.id = messageId;
    
    if (sender === 'bot') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${isLoading ? '<em>' + text + '</em>' : text}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
            <div class="message-avatar" style="background: linear-gradient(135deg, #0066FF 0%, #00C9FF 100%);">
                <i class="fas fa-user"></i>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// ============ АНИМАЦИИ ПРИ ПРОКРУТКЕ ============
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Наблюдать за всеми карточками
document.querySelectorAll('.problem-card, .detail-card, .result-card, .testimonial-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// ============ СЧЁТЧИКИ ============
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value + (element.dataset.suffix || '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Анимация статистики при появлении
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            const number = entry.target.querySelector('h3');
            if (number) {
                const value = parseInt(number.textContent);
                if (!isNaN(value)) {
                    number.dataset.suffix = number.textContent.replace(/\d+/g, '');
                    animateValue(number, 0, value, 2000);
                    entry.target.dataset.animated = 'true';
                }
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-card, .result-card').forEach(card => {
    statsObserver.observe(card);
});

console.log('🏔️ Сайт "Спасение Ледников Алматы" загружен успешно!');
