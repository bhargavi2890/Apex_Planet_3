document.addEventListener('DOMContentLoaded', function() {
    const categoryLinks = document.querySelectorAll('.category-link');
    const categoryTitle = document.getElementById('category-title');
    const carousel = document.querySelector('.carousel');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.querySelector('.close-btn');

    let currentCategory = null;
    let currentIndex = 0;
    let currentCards = [];
    const RIDDLE_API = {
        baseUrl: 'https://riddles-api.vercel.app',
        endpoints: {
            general: '/random',
            math: '/random?category=math',
            logic: '/random?category=logic',
            funny: '/random?category=funny',
            kids: '/random?category=kids'
        }
    };

    const WIKI_API = {
        baseUrl: 'https://en.wikipedia.org/w/api.php',
        params: {
            action: 'query',
            format: 'json',
            prop: 'extracts',
            exintro: true,
            explaintext: true,
            origin: '*'
        }
    };
    const FALLBACK_RIDDLES = {
        general: [
            {
                question: "What has keys but can't open locks?",
                answer: "piano",
                moreInfo: "A piano has 'keys' that you press to make music, but they can't open physical locks like door keys can.",
                fact: "The piano was invented by Bartolomeo Cristofori in Italy around the year 1700. Modern pianos typically have 88 keys."
            },
            {
                question: "What has to be broken before you can use it?",
                answer: "egg",
                moreInfo: "Eggs must be cracked open (broken) before you can use them for cooking or eating.",
                fact: "The largest egg laid by a living bird was from an ostrich, weighing about 2.5 pounds. Eggs are a complete protein source containing all nine essential amino acids."
            }
        ],
        math: [
            {
                question: "I am an odd number. Take away a letter and I become even. What number am I?",
                answer: "seven",
                moreInfo: "The word 'seven' is an odd number. If you remove the letter 's', it becomes 'even', which is an even number.",
                fact: "Seven is a prime number and is considered lucky in many cultures. There are seven days in a week, seven colors in a rainbow, and seven wonders of the ancient world."
            }
        ],
        logic: [
            {
                question: "A man lives on the 10th floor but takes the elevator to the 7th floor and walks up. Why?",
                answer: "elevator",
                moreInfo: "The man can reach the ground floor button and the 7th floor button, but can't reach the 10th floor button in the elevator.",
                fact: "The first elevator was installed in a New York City building in 1857. Modern elevators can travel at speeds up to 67 km/h (42 mph) in the world's fastest elevators."
            }
        ],
        funny: [
            {
                question: "What gets wetter the more it dries?",
                answer: "towel",
                moreInfo: "A towel gets wetter (absorbs more water) as it dries things.",
                fact: "The most absorbent towels are made from 100% cotton, particularly Egyptian or Turkish cotton. The average bath towel weighs about 1.5 pounds when dry but can absorb up to 1 pound of water."
            }
        ],
        kids: [
            {
                question: "What has hands but can't clap?",
                answer: "clock",
                moreInfo: "A clock has hour and minute hands but can't clap like human hands.",
                fact: "The first mechanical clocks were developed in Europe during the 14th century. The world's most accurate clock, an atomic clock, won't lose a second in 15 billion years."
            }
        ]
    };
    function initEventListeners() {
        categoryLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const category = this.getAttribute('data-category');
                loadCategory(category);
            });
        });

        prevBtn.addEventListener('click', showPrevCard);
        nextBtn.addEventListener('click', showNextCard);
        closeBtn.addEventListener('click', closeModal);

        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (currentCards.length === 0) return;
            
            if (e.key === 'ArrowLeft') {
                showPrevCard();
            } else if (e.key === 'ArrowRight') {
                showNextCard();
            }
        });
    }
    async function loadCategory(category) {
        currentCategory = category;
        currentIndex = 0;
        updateActiveCategory(category);
        categoryTitle.textContent = `Loading ${capitalizeFirstLetter(category)} Riddles...`;
        carousel.innerHTML = '<div class="loading">Loading riddles...</div>';
        
        try {
            const apiRiddles = await fetchSingleWordRiddlesFromAPI(category);
            currentCards = apiRiddles.length > 0 ? apiRiddles : FALLBACK_RIDDLES[category] || [];
            
            if (currentCards.length === 0) {
                showNoRiddlesMessage(category);
                return;
            }
            
            renderFlashcards();
            showCard(currentIndex);
            
        } catch (error) {
            console.error('Error loading riddles:', error);
            currentCards = FALLBACK_RIDDLES[category] || [];
            
            if (currentCards.length === 0) {
                showNoRiddlesMessage(category);
            } else {
                categoryTitle.textContent = `${capitalizeFirstLetter(category)} Riddles (Offline)`;
                renderFlashcards();
                showCard(currentIndex);
            }
        }
    }
 async function fetchSingleWordRiddlesFromAPI(category) {
        const endpoint = RIDDLE_API.endpoints[category] || RIDDLE_API.endpoints.general;
        const maxAttempts = 20; 
        const neededRiddles = 30; 
        const foundRiddles = [];
        
        for (let attempt = 0; attempt < maxAttempts && foundRiddles.length < neededRiddles; attempt++) {
            try {
                const response = await fetch(`${RIDDLE_API.baseUrl}${endpoint}`);
                
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                
                const riddleData = await response.json();
                
                if (riddleData.answer && !riddleData.answer.includes(' ') && !riddleData.answer.includes('-')) {
                   let fact = "No additional information available.";
                    try {
                        const mainNoun = extractMainNoun(riddleData.answer);
                        if (mainNoun) {
                            fact = await fetchFactAboutAnswer(mainNoun);
                        }
                    } catch (error) {
                        console.error('Error fetching fact:', error);
                        const fallbackRiddle = FALLBACK_RIDDLES[category]?.find(r => 
                            r.answer.toLowerCase() === riddleData.answer.toLowerCase()
                        );
                        fact = fallbackRiddle?.fact || fact;
                    }
                    
                    foundRiddles.push({
                        question: riddleData.riddle,
                        answer: riddleData.answer,
                        moreInfo: "Click 'Know More' to learn about the answer!",
                        fact: fact
                    });
                }
               await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error('Error fetching riddle:', error);
                }
        }
        
        return foundRiddles;
    }
    function extractMainNoun(answer) {
        if (!answer) return null;
        const cleaned = answer.toString().toLowerCase()
            .replace(/^(i am|i'm|it is|it's|this is|a|an|the)\s+/i, '')
            .replace(/[.,!?]$/, '')
            .trim();
        const words = cleaned.split(/\s+/);
        const likelyNouns = words.filter(word => 
            word.length > 3 &&  // Assume nouns are longer than 3 chars
            !['with', 'and', 'but', 'or', 'that', 'your'].includes(word)
        );
        if (likelyNouns.length > 0) {
            return likelyNouns.sort((a, b) => b.length - a.length)[0];
        }
        
        return words[words.length - 1] || cleaned;
    }
    async function fetchFactAboutAnswer(answer) {
        const params = new URLSearchParams({
            ...WIKI_API.params,
            titles: answer
        });
        
        const response = await fetch(`${WIKI_API.baseUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Wikipedia API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId === "-1") {
            return `No Wikipedia page found about ${answer}.`;
        }
        
        const extract = pages[pageId].extract;
        if (!extract) {
            return `No information available about ${answer}.`;
        }
        const paragraphs = extract.split('\n').filter(p => p.trim().length > 0);
        const fact = paragraphs.slice(0, 2).join('\n\n');
        
        return `About ${answer}:\n\n${fact}`;
    }
    function updateActiveCategory(activeCategory) {
        categoryLinks.forEach(link => {
            link.classList.toggle(
                'active',
                link.getAttribute('data-category') === activeCategory
            );
        });
    }
    function showNoRiddlesMessage(category) {
        categoryTitle.textContent = `${capitalizeFirstLetter(category)} Riddles`;
        carousel.innerHTML = '<div class="no-riddles">No riddles available for this category.</div>';
    }
    function renderFlashcards() {
        categoryTitle.textContent = `${capitalizeFirstLetter(currentCategory)} Riddles`;
        carousel.innerHTML = '';
        
        currentCards.forEach((card, index) => {
            const flashcard = createFlashcard(card, index);
            carousel.appendChild(flashcard);
        });
    }

    function createFlashcard(cardData, index) {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.dataset.index = index;
        
        const mainNoun = extractMainNoun(cardData.answer) || cardData.answer;
        
        flashcard.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <h3 class="flashcard-question">${cardData.question}</h3>
                    <div class="answer-input-container">
                        <input type="text" class="answer-input" placeholder="Type your answer...">
                        <button class="submit-answer-btn">Submit</button>
                    </div>
                    <div class="answer-feedback"></div>
                    <button class="flip-btn">Reveal Answer</button>
                </div>
                <div class="flashcard-back">
                    <h3 class="flashcard-answer">Answer: ${cardData.answer}</h3>
                    <div class="flashcard-more-info">${cardData.moreInfo}</div>
                    <button class="know-more-btn">Know More About ${capitalizeFirstLetter(mainNoun)}</button>
                    <button class="flip-btn">Flip Back</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const flipButtons = flashcard.querySelectorAll('.flip-btn');
        flipButtons.forEach(btn => {
            btn.addEventListener('click', () => flashcard.classList.toggle('flipped'));
        });
        
        // Answer submission handling
        const answerInput = flashcard.querySelector('.answer-input');
        const submitBtn = flashcard.querySelector('.submit-answer-btn');
        const feedback = flashcard.querySelector('.answer-feedback');
        
        submitBtn.addEventListener('click', checkAnswer);
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
        
        function checkAnswer() {
            const userAnswer = answerInput.value.trim().toLowerCase();
            const correctAnswer = cardData.answer.toLowerCase();
            
            if (userAnswer === correctAnswer) {
                feedback.textContent = 'Correct!';
                feedback.style.color = '#2ecc71';
                setTimeout(() => {
                    flashcard.classList.add('flipped');
                    feedback.textContent = '';
                    answerInput.value = '';
                }, 800);
            } else {
                feedback.textContent = 'Wrong answer! Try again.';
                feedback.style.color = '#e74c3c';
                answerInput.value = '';
                setTimeout(() => {
                    feedback.textContent = '';
                }, 1500);
            }
        }
        
        // Know More button handler
        flashcard.querySelector('.know-more-btn').addEventListener('click', async () => {
            try {
                showLoadingInModal(mainNoun);
                
                if (cardData.fact) {
                    showMoreInfo(cardData.question, cardData.fact);
                } else {
                    const fact = await fetchFactAboutAnswer(mainNoun);
                    showMoreInfo(cardData.question, fact);
                    cardData.fact = fact;
                }
            } catch (error) {
                console.error('Error showing more info:', error);
                showMoreInfo(
                    cardData.question,
                    `Couldn't load information about ${mainNoun}. ${error.message}`
                );
            }
        });
        
        return flashcard;
    }

    // Show loading state in modal
    function showLoadingInModal(answer) {
        modalTitle.textContent = `Loading facts about ${answer}...`;
        modalContent.innerHTML = '<div class="loading-spinner"></div>';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Show more information in modal
    function showMoreInfo(question, content) {
        modalTitle.textContent = question;
        modalContent.innerHTML = `
            <div class="fact-container">
                <div class="fact-title">Interesting Fact</div>
                <div class="fact-content">${content}</div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Close the modal
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Show a specific card in the carousel
    function showCard(index) {
        const cards = document.querySelectorAll('.flashcard');
        cards.forEach((card, i) => {
            card.style.transform = `translateX(${(i - index) * 100}%)`;
            card.style.opacity = i === index ? '1' : '0.5';
            card.style.zIndex = i === index ? '1' : '0';
        });
    }

    // Show previous card
    function showPrevCard() {
        if (currentCards.length === 0) return;
        currentIndex = (currentIndex - 1 + currentCards.length) % currentCards.length;
        showCard(currentIndex);
    }

    // Show next card
    function showNextCard() {
        if (currentCards.length === 0) return;
        currentIndex = (currentIndex + 1) % currentCards.length;
        showCard(currentIndex);
    }

    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Initialize the app
    initEventListeners();
    loadCategory('general');
});