// --- Game State & Variables ---
let storyData = null;
let currentNode = null;
let isTyping = false;
let typeInterval = null;
let currentWords = [];
let wordIndex = 0;
let isWaitingForChoice = false;
let pendingReturnNode = null; 

// --- DOM Elements ---
const bgLayer = document.getElementById('game-background');
const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');
const choicesContainer = document.getElementById('choices-container');
const descriptionBox = document.getElementById('choice-description');

// --- Initialization ---
document.getElementById('start-btn').addEventListener('click', startGame);
gameScreen.addEventListener('click', handleScreenClick);

// --- Particle System for Title Screen ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for(let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5
        });
    }
    animateParticles();
}

// Ensure particles adapt when resizing window or rotating a device
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if(p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    if(!titleScreen.classList.contains('hidden')) {
        requestAnimationFrame(animateParticles);
    }
}
initParticles();

// --- Core Game Logic ---

async function startGame() {
    try {
        const response = await fetch('story.txt');
        storyData = await response.json();
        
        titleScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        loadNode('start');
    } catch (error) {
        console.error("Error loading story.txt.", error);
        alert("Failed to load story data. Check console for details.");
    }
}

function loadNode(nodeKey) {
    if(!storyData[nodeKey]) return;
    
    currentNode = storyData[nodeKey];
    isWaitingForChoice = false;
    
    // Set Background
    if (currentNode.bg && currentNode.bg !== "none") {
        bgLayer.style.backgroundImage = `url('${currentNode.bg}')`;
    } else if (currentNode.bg === "none") {
        bgLayer.style.backgroundImage = "none";
    }

    // Move dialogue box to the top if choices are present
    if (currentNode.choices && currentNode.choices.length > 0) {
        dialogueBox.classList.add('at-top');
    } else {
        dialogueBox.classList.remove('at-top');
    }

    // Hide choices and start typing dialogue
    choicesContainer.classList.add('hidden');
    descriptionBox.classList.add('hidden'); // Ensure description hides on new node
    choicesContainer.innerHTML = '';
    dialogueBox.classList.remove('hidden');
    
    startTyping(currentNode.text, 100); 
}

function startTyping(text, speed) {
    clearInterval(typeInterval);
    dialogueText.innerHTML = "";
    currentWords = text.split(" ");
    wordIndex = 0;
    isTyping = true;
    
    typeInterval = setInterval(addWord, speed);
}

function addWord() {
    if (wordIndex < currentWords.length) {
        dialogueText.innerHTML += currentWords[wordIndex] + " ";
        wordIndex++;
    } else {
        finishTyping();
    }
}

function finishTyping() {
    clearInterval(typeInterval);
    isTyping = false;
    dialogueText.innerHTML = currentWords.join(" "); 
    
    // If node has choices and we aren't currently viewing a tempDialogue
    if (currentNode.choices && currentNode.choices.length > 0 && !pendingReturnNode) {
        showChoices(currentNode.choices);
    }
}

function handleScreenClick(e) {
    // Ignore clicks on choice buttons to prevent doubling up events
    if(e.target.closest('.choice-btn')) return;

    if (isTyping) {
        // Skip typing effect: finish text immediately
        finishTyping();
    } else {
        // If choices are on screen, prevent skipping past them
        if (isWaitingForChoice) return;
        
        // Advance story depending on current state
        if (pendingReturnNode) {
            let next = pendingReturnNode;
            pendingReturnNode = null;
            loadNode(next);
        } else if (currentNode.next) {
            loadNode(currentNode.next);
        } else if (!currentNode.choices) {
            dialogueBox.classList.add('hidden'); // End of story
        }
    }
}

function showChoices(choicesArray) {
    isWaitingForChoice = true;
    choicesContainer.innerHTML = '';
    choicesContainer.classList.remove('hidden');
    
    choicesArray.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        
        const img = document.createElement('img');
        img.src = choice.image;
        
        const span = document.createElement('span');
        span.innerText = choice.text;
        
        btn.appendChild(img);
        btn.appendChild(span);
        
        // Hover Events for light blue description under buttons
        btn.addEventListener('mouseenter', () => {
            descriptionBox.innerText = choice.description;
            descriptionBox.classList.remove('hidden');
        });
        btn.addEventListener('mouseleave', () => {
            descriptionBox.classList.add('hidden');
        });
        
        // Click Event: Handle choice selection and tempDialogue
        btn.addEventListener('click', () => {
            // Hide choices and descriptions immediately
            descriptionBox.classList.add('hidden');
            choicesContainer.classList.add('hidden');
            
            // Re-center the dialogue box for the temporary dialogue
            dialogueBox.classList.remove('at-top');

            // Start temp text and queue up the next node
            pendingReturnNode = choice.returnNode;
            startTyping(choice.tempDialogue, 250);
            isWaitingForChoice = false; 
        });
        
        choicesContainer.appendChild(btn);
    });
}