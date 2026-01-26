let lastScrollTop = window.scrollY;
let lastTime = Date.now();
let speedSamples = [];
let isLocked = false; 

const breakObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            isLocked = true;
            breakObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0 });

const breakElement = document.querySelector('.break');
if (breakElement) breakObserver.observe(breakElement);

// Track reading time
let readingStartTime = null;
let readingEndTime = null;
const contentElement = document.querySelector('.content');

const readingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && readingStartTime === null) {
            readingStartTime = performance.now();
            readingEndTime = null;
            console.log("Content visible. Reading time started...");
        } else if (!entry.isIntersecting && readingStartTime !== null && readingEndTime === null) {
            readingEndTime = performance.now();
            console.log("Content scrolled out. Reading time stopped...");
        }
    });
}, { threshold: 0.5 });

if (contentElement) readingObserver.observe(contentElement);

window.addEventListener('scroll', () => {
    if (isLocked) return;

    const currentScrollTop = window.scrollY;
    const currentTime = Date.now();
    const distance = Math.abs(currentScrollTop - lastScrollTop);
    const timeDiff = currentTime - lastTime;

    if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}

    if (timeDiff > 0) {
        const currentSpeed = (distance / timeDiff) * 1000;
        
        speedSamples.push(currentSpeed);
        if (speedSamples.length > 15) speedSamples.shift();

        const averageSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
        const displayElement = document.querySelector('.scroll-speed');
        
        if (displayElement) {
            displayElement.innerText = `${Math.round(averageSpeed)} px/s`;
        }
    }

    lastScrollTop = currentScrollTop;
    lastTime = currentTime;
});
let visibilityStartTime = null;
const captchaContainer = document.querySelector('.fake-captcha-container');
const captchaInput = captchaContainer.querySelector('input');
const reactionTimeDisplay = document.querySelector('.reaction-time');

// 1. Observe when the CAPTCHA becomes visible to the user
const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && visibilityStartTime === null) {
            // Record the high-resolution timestamp the moment it appears
            visibilityStartTime = performance.now();
            console.log("Checkbox visible. Timing started...");
        }
    });
}, { threshold: 0.5 }); // Starts timing when 50% of the box is visible

visibilityObserver.observe(captchaContainer);

// 2. Track the click event
captchaInput.addEventListener('change', function() {
    if (this.checked && visibilityStartTime !== null) {
        const clickTime = performance.now();
        const reactionTimeMs = clickTime - visibilityStartTime;
        const seconds = (reactionTimeMs / 1000).toFixed(2);

        // Display the reaction time
        if (reactionTimeDisplay) {
            reactionTimeDisplay.innerText = `${seconds}s`;
        }

        // Show the reaction time container
        const reactionTimeContainer = document.querySelector('#reaction-time-container');
        if (reactionTimeContainer) {
            reactionTimeContainer.style.display = 'block';
        }

        // Calculate and display reading time
        let userWPM = 0;
        let readingSeconds = 0;
        if (readingStartTime !== null) {
            const endTime = readingEndTime || clickTime;
            const readingTimeMs = endTime - readingStartTime;
            readingSeconds = (readingTimeMs / 1000).toFixed(2);
            const readingTimeDisplay = document.querySelector('.reading-time');
            if (readingTimeDisplay) {
                readingTimeDisplay.innerText = `${readingSeconds}s`;
            }

            const readingTimeContainer = document.querySelector('#reading-time-container');
            if (readingTimeContainer) {
                readingTimeContainer.style.display = 'block';
            }

            // Calculate WPM (assuming 150 words in the paragraph)
            const paragraphWords = 150;
            const readingMinutes = readingTimeMs / 60000;
            userWPM = Math.round(paragraphWords / readingMinutes);
        }

        // Generate profile and display chart (only if read for at least 20 seconds)
        displayProfile(userWPM, seconds, speedSamples.length > 0 ? Math.round(speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length) : 0, readingSeconds);

        console.log(`User clicked in ${reactionTimeMs.toFixed(2)}ms`);

        // Optional: Hide after showing the result for a moment
        setTimeout(() => {
            captchaContainer.style.display = 'none';
        }, 1200);
    }
});

function displayProfile(wpm, reactionTime, scrollSpeed, readingSeconds) {
    const profileContainer = document.querySelector('#profile-container');
    
    // Check if reading time is at least 42 seconds
    if (readingSeconds < 7) {
        // Show "You did not read" message
        const profileContent = profileContainer.querySelector('.profile-content') || profileContainer;
        profileContent.innerHTML = '<h2 style="color: #ff6b6b; font-size: 24px;">You did not read.</h2>';
        profileContainer.style.display = 'block';
        return;
    }
    
    // Calculate metrics
    const avgReactionTime = 1.75; // midpoint of 1.5-2
    const avgScrollSpeed = 1350; // midpoint of 1200-1500
    
    // Determine badges based on new logic
    const reactionRatio = parseFloat(reactionTime) / avgReactionTime;
    const scrollRatio = scrollSpeed / avgScrollSpeed;
    
    // Attention Span: based on time spent reading (more time = better attention)
    let attentionBadge = readingSeconds > 60 ? 'High Attention Span' : readingSeconds < 20 ? 'Low Attention Span' : 'Average Attention';
    
    // Awareness: based on scroll speed (slower scroll = more aware)
    let speedBadge = scrollRatio < 0.8 ? 'Highly Aware' : scrollRatio > 1.2 ? 'Less Aware' : 'Moderately Aware';
    
    // Reaction: slower reaction = worse
    let responseBadge = reactionRatio < 0.8 ? 'Quick Reflexes' : reactionRatio > 1.2 ? 'Slow Reaction' : 'Good Response Time';
    
    // Update badges
    document.querySelector('#attention-badge').textContent = attentionBadge;
    document.querySelector('#speed-badge').textContent = speedBadge;
    document.querySelector('#response-badge').textContent = responseBadge;
    
    // Update chart data
    document.querySelector('#user-wpm').textContent = wpm;
    document.querySelector('#user-reaction').textContent = reactionTime;
    document.querySelector('#user-scroll').textContent = scrollSpeed;
    
    // Calculate bar widths (max 100%)
    // Attention: based on time spent (42 seconds = 50%, 120+ seconds = 100%)
    const attentionWidth = Math.min(((readingSeconds - 42) / 78) * 100, 100);
    
    // Reaction: inverse ratio (lower reaction time = better)
    const reactionWidth = Math.min((100 / reactionRatio), 150);
    
    // Scroll Speed: inverse ratio (slower scroll = more aware = better)
    const scrollWidth = Math.min((100 / scrollRatio), 150);
    
    document.querySelector('#reading-speed-bar').style.width = attentionWidth + '%';
    document.querySelector('#reaction-bar').style.width = reactionWidth + '%';
    document.querySelector('#scroll-bar').style.width = scrollWidth + '%';
    
    // Calculate average attention span based on all three factors
    const attentionScore = (attentionWidth / 100 + (1 / reactionRatio) / 1.5 + (1 / scrollRatio) / 1.5) / 3;
    const attentionLevel = attentionScore > 0.8 ? 'Excellent' : attentionScore > 0.6 ? 'Good' : 'Needs Improvement';
    
    // Add average attention span at the end
    const averageAttentionDiv = document.querySelector('#average-attention');
    if (averageAttentionDiv) {
        averageAttentionDiv.innerHTML = `<h2>Your Average Attention Span: <span style="color: #00d4ff;">${attentionLevel}</span></h2>`;
        averageAttentionDiv.style.display = 'block';
    }
    
    // Show profile container
    profileContainer.style.display = 'block';
}
