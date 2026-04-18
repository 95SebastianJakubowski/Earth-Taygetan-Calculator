const images = {};
const symbols = ["1","2","3","4","5","6","7","8","9","A","B","C","plus","minus"];

let currentBase = 10;
let expression = "";
let imagesReady = false;

function preloadImages(callback) {
    let loaded = 0;

    symbols.forEach(sym => {
        const img = new Image();

        const done = () => {
            loaded++;
            if (loaded === symbols.length) {
                callback();
            }
        };

        img.onload = () => {
            console.log("OK:", sym);
            done();
        };

        img.onerror = () => {
            console.error("Loading Error:", sym);
            done();
        };

        img.src = "assets/" + sym + ".png";
        images[sym] = img;
    });
}


window.onload = () => {
    preloadImages(() => {
        imagesReady = true;
    });
    setBase(10);
};


function appendSymbol(symbol) {
    const operators = ["+", "-"];
    const lastChar = expression.slice(-1);

    // block duplicate operators
    if (operators.includes(symbol)) {
        if (expression === "") return; // don't start with +/-

        if (operators.includes(lastChar)) {
            return; // blocks ++, +-, -+, --
        }
    }

    expression += symbol;
    updateDisplay();
}

function removeLast() {
    if (expression.length > 0) {
        expression = expression.slice(0, -1);
        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById("display").innerText = expression || "0";
}

function evaluateExpression(expr) {
    // we separate by + and -
    let tokens = expr.match(/[0-9AB]+|[+\-]/gi);

    if (!tokens) throw new Error("Invalid expression");

    let result = 0;
    let currentOp = "+";

    for (let token of tokens) {
        if (token === "+" || token === "-") {
            currentOp = token;
        } else {
            let value;

            if (currentBase === 10) {
                value = parseInt(token);
            } else {
                value = e12_to_e10(token);
            }

            if (currentOp === "+") result += value;
            else result -= value;
        }
    }

    return result;
}


function clearInput() {
    expression = "";
    updateDisplay();

    // clear texts
    document.getElementById("subDisplay").innerHTML = "";
    document.getElementById("subDisplayT").innerHTML = "";

    // clear canvas
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}



function setBase(base) {
    currentBase = base;

    const btn10 = document.getElementById("btn10");
    const btn12 = document.getElementById("btn12");

    btn10.classList.toggle("active-base", base === 10);
    btn12.classList.toggle("active-base", base === 12);

    // RESET
    clearInput();
}

// ===== CONVERSIONS =====

function e10_to_e12(n) {
    if (n === 0) return "0";
    const digits = "0123456789AB";
    let result = "";

    while (n > 0) {
        let r = n % 12;
        result = digits[r] + result;
        n = Math.floor(n / 12);
    }

    return result;
}

function e12_to_e10(s) {
    const digits = {
        '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,
        '6':6,'7':7,'8':8,'9':9,'A':10,'B':11
    };

    let total = 0;

    for (let char of s.toUpperCase()) {
        if (!(char in digits)) throw new Error("Invalid char: " + char);
        total = total * 12 + digits[char];
    }

    return total;
}

function e10_to_t12(n) {
    if (n <= 0) throw new Error("Only positive");

    let blocks = [];
    let k = 0;

    while (12 ** (k + 1) <= n) k++;

    while (k >= 0) {
        let power = 12 ** k;
        let d = Math.floor(n / power);
        n %= power;

        if (d > 0) {
            let block;

            if (d === 1) {
                block = "C".repeat(k) || "1"; 
            } else {
                let digit = d === 10 ? "A" : d === 11 ? "B" : d.toString();
                block = digit + "C".repeat(k);
            }

            blocks.push(block);
        }

        k--;
    }

    return blocks;
}


function drawT12(blocks) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const symbolSize = 45;
    const gap = 5;
    const padding = 10;
    const maxWidth = 350;

    // COUNTING ROWS
    let x = padding;
    let rows = 1;

    function blockWidth(block) {
        let width = 0;

        for (let char of block) {
            const img = images[char];
            if (!img || !img.complete) continue;

            const aspect = img.naturalWidth / img.naturalHeight;
            width += symbolSize * aspect + gap;
        }

        return width;
    }

    blocks.forEach((block, i) => {
        const bWidth = blockWidth(block);

        if (x + bWidth > maxWidth) {
            x = padding;
            rows++;
        }

        x += bWidth;

        if (i < blocks.length - 1) {
            const plusImg = images["plus"];

            if (plusImg && plusImg.complete) {
                const aspect = plusImg.naturalWidth / plusImg.naturalHeight;
                const opWidth = symbolSize * aspect + gap;

                if (x + opWidth > maxWidth) {
                    x = padding;
                    rows++;
                }

                x += opWidth;
            }
        }
    });

    // SET YOUR CANVAS BEFORE DRAWING
    canvas.width = maxWidth;
    canvas.height = rows * (symbolSize + 20);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // DRAWING
    let drawX = padding;
    let drawY = 20;

    blocks.forEach((block, i) => {

        const bWidth = blockWidth(block);

        if (drawX + bWidth > maxWidth) {
            drawX = padding;
            drawY += symbolSize + 20;
        }

        // 🔹 rysuj blok
        for (let char of block) {
            const img = images[char];

            if (!img || !img.complete) continue;

            const aspect = img.naturalWidth / img.naturalHeight;
            const drawWidth = symbolSize * aspect;

            ctx.drawImage(img, drawX, drawY, drawWidth, symbolSize);
            drawX += drawWidth + gap;
        }

        // DRAW PLUS
        if (i < blocks.length - 1) {
            const plusImg = images["plus"];

            if (plusImg && plusImg.complete) {
                const aspect = plusImg.naturalWidth / plusImg.naturalHeight;
                const drawWidth = symbolSize * aspect;

                if (drawX + drawWidth > maxWidth) {
                    drawX = padding;
                    drawY += symbolSize + 20;
                }

                ctx.drawImage(plusImg, drawX, drawY, drawWidth, symbolSize);
                drawX += drawWidth + gap;
            }
        }
    });
}


function convert() {
    
    try {
        if (!expression) return;

        if (!imagesReady) {
            alert("Obrazy jeszcze się ładują");
            return;
        }

        const base10 = evaluateExpression(expression);
        const base12 = e10_to_e12(base10);
        const t12 = e10_to_t12(base10);

        document.getElementById("subDisplay").innerHTML =
            `<b>Earth decimal(10):</b> ${base10}<br>
            <b>Earth duodecimal(12):</b> ${base12}`;

        document.getElementById("subDisplayT").innerHTML =
            `<b>Taygetan duodecimal(12):</b>`;
        console.log("blocks:", t12);
        drawT12(t12);

    } catch (e) {
        alert(e.message);
    }
}


