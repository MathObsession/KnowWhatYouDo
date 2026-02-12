const OPENROUTER_API_KEY = "NO_API_KEY_FOR_SAFETY";

const topics = [
    "Artificial Intelligence",
    "Chemistry",
    "Physics",
    "Trigonometry",
    "History"
];

const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
const contentElement = document.querySelector(".content");

let generatedWordCount = 0;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function generateAIContent(){
    contentElement.innerHTML="";
    const cursor=document.createElement("span");
    cursor.innerHTML="▋";
    contentElement.appendChild(cursor);

    const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
            "Authorization":`Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            model:"stepfun/step-3.5-flash:free",
            stream:true,
            messages:[{
                role:"user",
                content:`Write a detailed 350-word educational paragraph about ${selectedTopic}.`
            }]
        })
    });

    const reader=response.body.getReader();
    const decoder=new TextDecoder();

    while(true){
        const {done,value}=await reader.read();
        if(done) break;

        const chunk=decoder.decode(value);
        const lines=chunk.split("\n");

        for(let line of lines){
            if(line.startsWith("data: ")){
                const jsonStr=line.replace("data: ","").trim();
                if(jsonStr==="[DONE]"){
                    cursor.remove();
                    generatedWordCount = contentElement.innerText.split(/\s+/).length;
                    return;
                }
                try{
                    const parsed=JSON.parse(jsonStr);
                    const token=parsed.choices?.[0]?.delta?.content;
                    if(token){
                        cursor.remove();
                        contentElement.innerHTML+=token;
                        contentElement.appendChild(cursor);
                        await sleep(25);
                    }
                }catch{}
            }
        }
    }
}
generateAIContent();

let readingStart = null;
let activeReadingTime = 0;
let lastMouseMoveTime = Date.now();
let regressionCount = 0;
let totalScrollDistance = 0;
let lastScrollY = window.scrollY;
let scrollSpeeds = [];
let scrollStartTime = Date.now();
let scrollEndTime = null;
let isLocked = false;

const breakElement = document.querySelector(".break");

const breakObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            isLocked = true;
            scrollEndTime = Date.now();
        }
    });
});
breakObserver.observe(breakElement);

const readingObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting && !readingStart){
            readingStart = Date.now();
        }
    });
},{threshold:0.7});
readingObserver.observe(contentElement);

let totalCursorDistance = 0;
let cursorInsideParagraphTime = 0;
let paragraphHoverStart = null;

contentElement.addEventListener("mouseenter",()=>{
    paragraphHoverStart = Date.now();
});
contentElement.addEventListener("mouseleave",()=>{
    if(paragraphHoverStart){
        cursorInsideParagraphTime += Date.now() - paragraphHoverStart;
        paragraphHoverStart = null;
    }
});

document.addEventListener("mousemove",e=>{
    const now = Date.now();
    const dx = e.movementX;
    const dy = e.movementY;
    totalCursorDistance += Math.sqrt(dx*dx + dy*dy);

    if(now - lastMouseMoveTime < 2000){
        activeReadingTime += 16;
    }

    lastMouseMoveTime = now;
});

window.addEventListener("scroll",()=>{
    if(isLocked) return;

    const now = Date.now();
    const dy = window.scrollY - lastScrollY;

    if(dy < 0) regressionCount++;

    totalScrollDistance += Math.abs(dy);

    const dt = now - scrollStartTime;
    if(dt>0){
        const speed = Math.abs(dy)/(dt/1000);
        scrollSpeeds.push(speed);
        if(scrollSpeeds.length>20) scrollSpeeds.shift();
        const avg = scrollSpeeds.reduce((a,b)=>a+b,0)/scrollSpeeds.length;
        document.querySelector(".scroll-speed").innerText = Math.round(avg)+" px/s";
    }

    lastScrollY = window.scrollY;
    scrollStartTime = now;
});

let attentionBias = 0;

document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
        attentionBias -= 35;
    }
});

const scrollWarning = document.getElementById("scroll-warning");

setInterval(()=>{
    if(readingStart && window.scrollY < 100){
        scrollWarning.style.display="block";
    } else {
        scrollWarning.style.display="none";
    }
},1000);

document.querySelector(".input").addEventListener("change",()=>{

    const now = Date.now();
    const totalTime = (now - readingStart)/1000;

    const expectedReadingTime = (generatedWordCount / 183) * 60;

    const readingEfficiency = totalTime / expectedReadingTime;

    const avgScrollSpeed = scrollSpeeds.length ?
        scrollSpeeds.reduce((a,b)=>a+b,0)/scrollSpeeds.length : 0;

    let attentionScore = 0;

    attentionScore += Math.max(0, 40 - Math.abs(readingEfficiency - 1)*40);
    attentionScore += Math.max(0, 20 - (avgScrollSpeed/150));
    attentionScore += Math.max(0, 20 - regressionCount*2);
    attentionScore += Math.min(15, cursorInsideParagraphTime/1000);
    attentionScore += attentionBias;

    attentionScore = Math.max(0, Math.min(100, attentionScore));

    let level =
        attentionScore > 85 ? "Elite Cognitive Engagement" :
        attentionScore > 70 ? "High Focus" :
        attentionScore > 50 ? "Moderate Attention" :
        attentionScore > 30 ? "Low Attention" :
        "Distracted";

    const totalScrollTime = ((scrollEndTime || Date.now()) - scrollStartTime)/1000;

    document.getElementById("profile-container").innerHTML = `
        <h2>Behavioral Reading Analysis</h2>
        <p><strong>Generated Words:</strong> ${generatedWordCount}</p>
        <p><strong>Expected Reading Time (183 WPM):</strong> ${expectedReadingTime.toFixed(2)} s</p>
        <p><strong>Actual Time on Text:</strong> ${totalTime.toFixed(2)} s</p>
        <p><strong>Reading Efficiency Ratio:</strong> ${readingEfficiency.toFixed(2)}</p>
        <p><strong>Total Scroll Distance:</strong> ${Math.round(totalScrollDistance)} px</p>
        <p><strong>Average Scroll Speed:</strong> ${Math.round(avgScrollSpeed)} px/s</p>
        <p><strong>Scroll Regressions:</strong> ${regressionCount}</p>
        <p><strong>Cursor Distance:</strong> ${Math.round(totalCursorDistance)} px</p>
        <p><strong>Cursor Time Over Paragraph:</strong> ${(cursorInsideParagraphTime/1000).toFixed(2)} s</p>
        <hr>
        <h2>Attention Score: ${attentionScore.toFixed(1)} / 100</h2>
        <h3>Level: ${level}</h3>
    `;

    document.getElementById("profile-container").style.display="block";
});
