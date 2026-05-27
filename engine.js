// Configuração do canvas
const canvas = document.getElementById('gameCanvas');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const ctx = canvas.getContext('2d');

// Variáveis globais
let score = 0;
let lives = 3;
let gameRunning = true;
let points = [];
let webs = [];
let snakeTrail = [];
const MAX_SNAKE_LENGTH = 500;
let playerStunned = false;
let stunTimer = 0;
const STUN_DURATION = 90;

// Criar pontos iniciais
function createPoints() {
    points = [];
    const cols = Math.floor(canvas.width / 40);
    const rows = Math.floor(canvas.height / 40);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if ((i + j) % 2 === 0 && i > 1 && i < rows - 1 && j > 1 && j < cols - 1) {
                points.push({ x: j * 40 + 20, y: i * 40 + 20, radius: 3 });
            }
        }
    }
    const extraPoints = Math.min(100, Math.floor(canvas.width * canvas.height / 8000));
    for (let i = 0; i < extraPoints; i++) {
        points.push({ x: Math.random() * (canvas.width - 60) + 30, y: Math.random() * (canvas.height - 60) + 30, radius: 4 });
    }
}
createPoints();
window.addEventListener('resize', () => { createPoints(); resetPositions(); resetSpecialAbilities(); });

// Personagem
let player = { x: canvas.width / 2, y: canvas.height / 2, radius: 14, speed: 0.12, angle: 0 };

// Fantasmas - Velocidades ajustadas
let ghosts = [
    { x: 100, y: 100, radius: 12, speed: 1.6, color: '#FF6B6B', name: 'Vermelho', type: 'chase' },
    { x: canvas.width - 100, y: 100, radius: 12, speed: 1.4, color: '#FFA500', name: 'Laranja', type: 'spawner', spawnTimer: 0, spawnDelay: 90, target: null },
    { x: 100, y: canvas.height - 100, radius: 12, speed: 0.6, color: '#FF69B4', name: 'Rosa', type: 'web', webTimer: 0, webDelay: 70 },
    { x: canvas.width - 100, y: canvas.height - 100, radius: 12, speed: 1.4, color: '#87CEEB', name: 'Azul', type: 'snake', target: null }
];

let mouseX = player.x, mouseY = player.y;

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let canvasMouseX = (e.clientX - rect.left) * scaleX;
    let canvasMouseY = (e.clientY - rect.top) * scaleY;
    if (canvasMouseX >= 0 && canvasMouseX <= canvas.width && canvasMouseY >= 0 && canvasMouseY <= canvas.height) {
        mouseX = Math.min(Math.max(canvasMouseX, player.radius + 10), canvas.width - player.radius - 10);
        mouseY = Math.min(Math.max(canvasMouseY, player.radius + 10), canvas.height - player.radius - 10);
    }
});

// Escolhe um quadrante aleatório e retorna um ponto dentro dele
function getRandomPointInQuadrant() {
    const quadrant = Math.floor(Math.random() * 4);
    let xMin, xMax, yMin, yMax;
    const margin = 50;
    if (quadrant === 0) {
        xMin = margin;
        xMax = canvas.width / 2 - margin;
        yMin = margin;
        yMax = canvas.height / 2 - margin;
    } else if (quadrant === 1) {
        xMin = canvas.width / 2 + margin;
        xMax = canvas.width - margin;
        yMin = margin;
        yMax = canvas.height / 2 - margin;
    } else if (quadrant === 2) {
        xMin = margin;
        xMax = canvas.width / 2 - margin;
        yMin = canvas.height / 2 + margin;
        yMax = canvas.height - margin;
    } else {
        xMin = canvas.width / 2 + margin;
        xMax = canvas.width - margin;
        yMin = canvas.height / 2 + margin;
        yMax = canvas.height - margin;
    }
    xMin = Math.max(xMin, margin);
    xMax = Math.max(xMax, xMin + 10);
    yMin = Math.max(yMin, margin);
    yMax = Math.max(yMax, yMin + 10);
    return { x: xMin + Math.random() * (xMax - xMin), y: yMin + Math.random() * (yMax - yMin) };
}

// Movimento baseado em quadrante para laranja e azul
function moveToQuadrant(ghost) {
    if (!ghost.target || Math.hypot(ghost.x - ghost.target.x, ghost.y - ghost.target.y) < 30) {
        ghost.target = getRandomPointInQuadrant();
    }
    const dx = ghost.target.x - ghost.x;
    const dy = ghost.target.y - ghost.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
        ghost.x += (dx / dist) * ghost.speed;
        ghost.y += (dy / dist) * ghost.speed;
    }
    ghost.x = Math.min(Math.max(ghost.x, ghost.radius + 10), canvas.width - ghost.radius - 10);
    ghost.y = Math.min(Math.max(ghost.y, ghost.radius + 10), canvas.height - ghost.radius - 10);
}

function updatePlayer() {
    if (playerStunned) {
        player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        stunTimer--;
        if (stunTimer <= 0) playerStunned = false;
    } else {
        player.x += (mouseX - player.x) * player.speed;
        player.y += (mouseY - player.y) * player.speed;
        player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    }
}

function updateGhosts() {
    for (let g of ghosts) {
        if (g.type === 'chase') {
            const dx = player.x - g.x, dy = player.y - g.y, dist = Math.hypot(dx, dy);
            if (dist > 0) { g.x += (dx / dist) * g.speed; g.y += (dy / dist) * g.speed; }
        } else if (g.type === 'spawner') {
            moveToQuadrant(g);
            g.spawnTimer = (g.spawnTimer || 0) + 1;
            if (g.spawnTimer >= g.spawnDelay) {
                g.spawnTimer = 0;
                for (let i = 0; i < 5; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let radius = 120 + Math.random() * 150;
                    let newX = g.x + Math.cos(angle) * radius;
                    let newY = g.y + Math.sin(angle) * radius;
                    newX = Math.min(Math.max(newX, 20), canvas.width - 20);
                    newY = Math.min(Math.max(newY, 20), canvas.height - 20);
                    points.push({ x: newX, y: newY, radius: 4 });
                }
            }
        } else if (g.type === 'web') {
            const dx = player.x - g.x, dy = player.y - g.y, dist = Math.hypot(dx, dy);
            if (dist > 0) { g.x += (dx / dist) * g.speed; g.y += (dy / dist) * g.speed; }
            g.webTimer = (g.webTimer || 0) + 1;
            if (g.webTimer >= g.webDelay) {
                g.webTimer = 0;
                const fullDist = Math.hypot(player.x - g.x, player.y - g.y);
                if (fullDist > 0) {
                    const fraction = 0.7 + Math.random() * 0.2;
                    const distToWeb = fullDist * fraction;
                    const normX = (player.x - g.x) / fullDist, normY = (player.y - g.y) / fullDist;
                    webs.push({ x: g.x + normX * distToWeb, y: g.y + normY * distToWeb, radius: 12, life: 150 });
                    if (webs.length > 8) webs.shift();
                }
            }
        } else if (g.type === 'snake') {
            moveToQuadrant(g);
            snakeTrail.push({ x: g.x, y: g.y });
            if (snakeTrail.length > MAX_SNAKE_LENGTH) snakeTrail.shift();
        }
        g.x = Math.min(Math.max(g.x, g.radius + 10), canvas.width - g.radius - 10);
        g.y = Math.min(Math.max(g.y, g.radius + 10), canvas.height - g.radius - 10);
    }
}

function resetSpecialAbilities() {
    webs = [];
    snakeTrail = [];
    playerStunned = false;
    stunTimer = 0;
    for (let g of ghosts) {
        if (g.type === 'spawner') g.spawnTimer = 0;
        if (g.type === 'web') g.webTimer = 0;
        g.target = null;
    }
}

function resetPositions() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    mouseX = player.x;
    mouseY = player.y;
    ghosts[0].x = 100; ghosts[0].y = 100;
    ghosts[1].x = canvas.width - 100; ghosts[1].y = 100;
    ghosts[2].x = 100; ghosts[2].y = canvas.height - 100;
    ghosts[3].x = canvas.width - 100; ghosts[3].y = canvas.height - 100;
    for (let g of [ghosts[1], ghosts[3]]) g.target = null;
    resetSpecialAbilities();
}

function checkCollisions() {
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            points.splice(i, 1);
            score += 10;
            const scoreEl = document.getElementById('gameScore');
            if (scoreEl) scoreEl.textContent = score;
            i--;
        }
    }

    for (let g of ghosts) {
        if ((g.type === 'chase' || g.type === 'web') && Math.hypot(player.x - g.x, player.y - g.y) < player.radius + g.radius) {
            lives--;
            document.getElementById('gameLives').textContent = lives;
            if (lives > 0) { resetPositions(); canvas.style.opacity = '0.5'; setTimeout(() => canvas.style.opacity = '1', 200); }
            else gameRunning = false;
            break;
        }
    }

    for (let i = 0; i < webs.length; i++) {
        const w = webs[i];
        if (Math.hypot(player.x - w.x, player.y - w.y) < player.radius + w.radius) {
            if (!playerStunned) { playerStunned = true; stunTimer = STUN_DURATION; }
            webs.splice(i, 1);
            i--;
        } else { w.life--; if (w.life <= 0) { webs.splice(i, 1); i--; } }
    }

    for (let seg of snakeTrail) {
        if (Math.hypot(player.x - seg.x, player.y - seg.y) < player.radius + 10) {
            lives--;
            document.getElementById('gameLives').textContent = lives;
            if (lives > 0) { resetPositions(); canvas.style.opacity = '0.5'; setTimeout(() => canvas.style.opacity = '1', 200); }
            else gameRunning = false;
            break;
        }
    }

    if (points.length === 0 && gameRunning) {
        createPoints();
        score += 100;
        document.getElementById('gameScore').textContent = score;
    }
}

// Desenhos (mantidos iguais)
function drawBackground() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#1a0b2e');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    ctx.fillRect(0, 0, canvas.width, 8);
    ctx.fillRect(0, 0, 8, canvas.height);
    ctx.fillRect(canvas.width-8, 0, 8, canvas.height);
    ctx.fillRect(0, canvas.height-8, canvas.width, 8);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.fillRect(0, 0, 40, 40);
    ctx.fillRect(canvas.width-40, 0, 40, 40);
    ctx.fillRect(0, canvas.height-40, 40, 40);
    ctx.fillRect(canvas.width-40, canvas.height-40, 40, 40);
}

function drawPoints() {
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = '#FFE5B4';
        ctx.fill();
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255,229,180,0.6)';
    }
    ctx.shadowBlur = 0;
}

function drawWebs() {
    for (let w of webs) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * Math.PI * 2;
            let x1 = w.x + Math.cos(angle) * (w.radius-2);
            let y1 = w.y + Math.sin(angle) * (w.radius-2);
            let x2 = w.x + Math.cos(angle + Math.PI) * (w.radius-2);
            let y2 = w.y + Math.sin(angle + Math.PI) * (w.radius-2);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(w.x, w.y, w.radius-4, 0, Math.PI*2); ctx.stroke();
    }
}

function drawSnakeTrail() {
    for (let i = 0; i < snakeTrail.length; i++) {
        ctx.beginPath();
        ctx.arc(snakeTrail[i].x, snakeTrail[i].y, 9, 0, Math.PI*2);
        ctx.fillStyle = `rgba(135, 206, 235, ${0.3 + (i/snakeTrail.length)*0.5})`;
        ctx.fill();
    }
}

function drawGhosts() {
    for (let g of ghosts) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = `${g.color}80`;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2);
        ctx.fillStyle = g.color;
        ctx.fill();
        ctx.fillStyle = g.color;
        const baseY = g.y + g.radius - 4;
        for (let i = -3; i <= 3; i++) ctx.fillRect(g.x + i * 4 - 2, baseY, 3, 8);
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(g.x-4, g.y-2, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x+4, g.y-2, 3.5, 0, Math.PI*2); ctx.fill();
        const angleToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
        const offX = Math.cos(angleToPlayer) * 1.5, offY = Math.sin(angleToPlayer) * 1.5;
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(g.x-4+offX, g.y-2+offY, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x+4+offX, g.y-2+offY, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(g.x-5+offX, g.y-3+offY, 0.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x+3+offX, g.y-3+offY, 0.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,182,193,0.7)';
        ctx.beginPath(); ctx.arc(g.x-7, g.y+1, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x+7, g.y+1, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

function drawPlayer() {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255,215,0,0.8)';
    const mouthOpen = Math.sin(Date.now() * 0.015) * 0.15;
    const mouthAngle = 0.3 + mouthOpen;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, player.angle + mouthAngle, player.angle + Math.PI*2 - mouthAngle);
    ctx.lineTo(player.x, player.y);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(player.x-3, player.y-3, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(player.x-4, player.y-4, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(player.x-5, player.y-5, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(player.x - 10, player.y - 20, 20, 6);
    ctx.fillRect(player.x - 6, player.y - 24, 12, 8);
    ctx.restore();
}

function gameLoop() {
    if (gameRunning) {
        updatePlayer();
        updateGhosts();
        checkCollisions();
        drawBackground();
        drawPoints();
        drawSnakeTrail();
        drawWebs();
        drawGhosts();
        drawPlayer();
        if (playerStunned) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(200, 200, 255, 0.3)';
            ctx.fill();
        }
    } else {
        drawBackground();
        drawPoints();
        drawSnakeTrail();
        drawWebs();
        drawGhosts();
        drawPlayer();
        ctx.font = 'bold 40px Poppins';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.fillText('💀 GAME OVER 💀', canvas.width/2, canvas.height/2 - 40);
        ctx.font = '20px Poppins';
        ctx.fillStyle = 'white';
        ctx.fillText(`Pontuação final: ${score}`, canvas.width/2, canvas.height/2 + 20);
        ctx.font = '16px Poppins';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Clique no botão "Reiniciar Jogo"', canvas.width/2, canvas.height/2 + 70);
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
    }
    requestAnimationFrame(gameLoop);
}

function resetGame() {
    score = 0;
    lives = 3;
    gameRunning = true;
    playerStunned = false;
    stunTimer = 0;
    document.getElementById('gameScore').textContent = score;
    document.getElementById('gameLives').textContent = lives;
    createPoints();
    resetPositions();
}

// HUD e eventos
function createFloatingHUD() {
    if (!document.querySelector('.game-hud')) {
        const hud = document.createElement('div');
        hud.className = 'game-hud';
        hud.innerHTML = `<span>⭐ <span id="gameScore">0</span></span><span>❤️ <span id="gameLives">3</span></span>`;
        document.body.appendChild(hud);
    }
    if (!document.querySelector('.game-reset-btn')) {
        const btn = document.createElement('button');
        btn.className = 'game-reset-btn';
        btn.innerHTML = '<i class="fas fa-redo-alt"></i> Reiniciar Jogo';
        btn.onclick = () => resetGame();
        document.body.appendChild(btn);
    }
}
setTimeout(createFloatingHUD, 100);

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
if (navToggle) navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
document.querySelectorAll('.nav-menu a').forEach(l => l.addEventListener('click', () => navMenu?.classList.remove('active')));
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});
const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', (e) => { e.preventDefault(); alert('✨ Mensagem enviada! Em breve entrarei em contato. 💖'); e.target.reset(); });

gameLoop();