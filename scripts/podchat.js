// PODCHAT EASTER EGGS
const PRIC_CHAT_POOL = [
    // --- MISC MESSAGES ---
    { s: "Stove", m: "Are you coming to our idea pod?" },
    { s: "Stove", m: "OOPS! HELLO NEW PERSON AND NOT TANNER!! SORRY!" },
    { s: "HR", m: "Hello and welcome to the PodCube ThinkWing! We’re excited to have a new PodCube Passenger on our team!" },
    { s: "HR", m: "Stop by our office during “PodCube Passenger Hours”: 3:30 - 3:45pm each Tuesday. Make an appointment!" },
    { s: "HR", m: "Feeling tired? Take a 5 minute stretch and grab a complimentary Sprot. Yummm-o!" },
    { s: "HR", m: "Interested in signing up for the PodCube 20th Annual Vegan Chili Cookoff? Stop by on Tuesdays!" },

    // PODBOT MESSAGES
    { s: "PodBot", m: "Thanks" },
    { s: "PodBot", m: "*** test…..{{{{...lol…PODCCCCCC ****" },
    { s: "PodBot", m: "Hope you’re feeling good! I know I am! ROFL" },
    { s: "PodBot", m: "Have some down time? Proactively e-enable scalable solutions until your next “big idea” strikes" },
    { s: "PodBot", m: "Do you like listening to music? That’s awesome! ROFL" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN 3rd floor visitor restroom ****" },
    { s: "PodBot", m: "Have you been holistically redefining your department’s highly efficient 'outside the cube' thinking?" },
    { s: "PodBot", m: "Our Galileo Drones effectively negotiate and navigate on-demand methods of delivery. Did you know that?" },
    { s: "PodBot", m: "suh dude? ROFL. Remember that funny video?" },
    { s: "PodBot", m: "SPROT!" },
    { s: "PodBot", m: "**** bandwidthhhh4hh4h{{4hh4hh44hhhh44}} ****" },
    { s: "PodBot", m: "What’s your favorite PodCube Transmission Era? I like 1848 in the hat store! ROFL" },
    { s: "PodBot", m: "The Departments in the Brain Tower efficiently orchestrate vertical leadership skills. Isn’t that cool?" },
    { s: "PodBot", m: "Do you ever watch livestreams on twitch when you’re not working? ROFL." },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN 1st floor visitor restroom ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN PodCube gift store ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN pSEC annex stairwell ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN unauthorized ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN on top of Lindsey’s desk galileo department ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN beryllium dorsal drive sail ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN caesium straighteners ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN beryllium dorsal drive boron rubidium spore-housing ****" },
    { s: "PodBot", m: "**** PODBUTLER STUCK IN mycellium annex ****" },
    { s: "PodBot", m: "skateboarding!" },
    { s: "PodBot", m: "backward-compatible outsourcing" },
    { s: "PodBot", m: "unique results. ROFL" },
    { s: "PodBot", m: "I’m PodBot. Isn’t that cool?" },
    { s: "PodBot", m: "BRB = be right back or bring real butter?" },
    { s: "PodBot", m: "There's an anomalous power signature in the rear Galileo hyper-sensitive FTL driver. ROFL" },
    { s: "PodBot", m: "Did you know that if your PodCube makes a “whoooz whoooz” sound it only takes seconds to fix? Check out PodCube Tech Talk #4" },
    { s: "PodBot", m: "where my PodFam at?! 😆 LOL!!" },
    { s: "PodBot", m: "Hey, PodFam! Anybody else in a ride share rn thinking about cooking meat irl? Hit me up!!" },
    { s: "PodBot", m: "doing an image search for silly pranks to do around the office! LOL! Just joking" },
    { s: "PodBot", m: "Have you tried saying “Hey, Podcube! Any new transmissions?” to your PodCube yet?" },
    { s: "PodBot", m: "Whooooaaaa! LOL! Just had a silly idea! LOL!!" },
    { s: "PodBot", m: "Your PodCube can actively translate up to 400 different languages, so you can get transmissions from all over time & space in your native language." },
    { s: "PodBot", m: "Cat videos! LOL!!" },
    { s: "PodBot", m: "Pumping Iron? No thanks! I'm too busy making Digital Milk." },
    { s: "PodBot", m: "I wish I could hold your hand while you listen to your favorite audio transmission. Not in a weird way! LOL! But, as friends." },

    // --- SERIAL CONVERSATIONS ---
    [
        { s: "Stove", m: "Prabot! WYD? Are you using the microwave?" },
        { s: "Prabot", m: "Which one?" },
        { s: "Stove", m: "the popular one" },
        { s: "Prabot", m: "which popular one? 3rd floor?" },
        { s: "Stove", m: "uhhhhhhh hold on" },
        { s: "Prabot", m: "??" },
        { s: "Stove", m: "crap. Hold on." },
        { s: "Prabot", m: "?????????" },
        { s: "Stove", m: "Yeah 3rd floor" },
        { s: "Prabot", m: "In the break room by the stairs?" },
        { s: "Stove", m: "no. Break room by elevator" },
        { s: "Prabot", m: "break room by the elevator?" },
        { s: "Stove", m: "yes" },
        { s: "Prabot", m: "where is that?" },
        { s: "Stove", m: "…….wdym?" },
        { s: "Prabot", m: "I mean, where is that!" },
        { s: "Stove", m: "forget it. I'm already late." },
        { s: "Prabot", m: "????" }
    ],
    [
        { s: "J. Huffman", m: "Prabot, do you know why the gift shop smells like a cigar?" },
        { s: "Prabot", m: "I don't….Stove, do you?" },
        { s: "J. Huffman", m: "Stove? Do you?" },
        { s: "Stove", m: "Yes, I'm writing the Incident Report on it now, actually. Stand by." },
        { s: "J. Huffman", m: "Is it due to an electrical issue?" },
        { s: "Prabot", m: "I would guess no, but Stove?" },
        { s: "Stove", m: "Non-electrical! Actually cigar. Again, I'll explain more once I finish the report." },
        { s: "J. Huffman", m: "How can you be certain it wasn't electrical?" },
        { s: "J. Huffman", m: "Follow-up, are you certain that it isn't an on-going issue? Are you writing the report via your PodTab so you can monitor the situation? Are you on scene at present?" },
        { s: "Stove", m: "NON-ELECTRICAL! STAND BY!" },
        { s: "J. Huffman", m: "I'm worried that it's an on-going electrical issue that needs immediate intervention. I'm sending Daniel." },
        { s: "Stove", m: "Do not send Daniel. I'm not there." },
        { s: "J. Huffman", m: "Daniel is en route to put an end to the on-going electrical issue in the gift shop." },
        { s: "Stove", m: "No one it there to meet Daniel" },
        { s: "J. Huffman", m: "Daniel is telling me no one is there right now?" }
    ],
    [
        { s: "Leslie", m: "Hey Tanner! Are you doing the vegan chili cookoff thing?" },
        { s: "Leslie", m: "Grehg in pSEC just brags and brags and bragggssssssss about his 4 consecutive wins and it’s exhausting" },
        { s: "Leslie", m: "Tanner? Chili?" },
        { s: "Leslie", m: "I’ll message you later" }
    ],
    [
        { s: "Prabot", m: "Tanner! Hey! Can you stop by my idea pod sometime today? Stove and I want to ask you a few questions." },
        { s: "Prabot", m: "You’re not in trouble! LOL!! We want to ask you about consumer data, etc. blah blah blah" },
        { s: "Prabot", m: "….wait….it this NOT Tanner?" }
    ],
    [
        
        { s: "Stove", m: "Hey, Tanner! Did you watch Monochrome’s Analysis last night?? They’re getting so desperate for viewers haha" },
        { s: "Stove", m: "Uh oh……did I spoilers?" },
        { s: "Stove", m: "Sorry if I did a spoilers!!" }
    ],
    [
        { s: "Jaspert", m: "Tanner! Did you bring any chicken with you today????? I brought a salad and I regret it." },
        { s: "Jaspert", m: "Tanner…..chicken??? I neeeeeeeed itttttt please!!!" },
        { s: "Jaspert", m: "Are you still mad about last week??" },
        { s: "Jaspert", m: "We were joking!! I thought we were cool???" },
        { s: "Jaspert", m: "It’s just a mustard stain, Tanner. It wasn’t a HUGE deal" },
        { s: "Jaspert", m: "Tanner. r u ok? Chicken?" },
        { s: "Jaspert", m: "……chicken?" },
        { s: "Jaspert", m: "Are you even here???" },
        { s: "Jaspert", m: "I’m texting you" }
    ],
    [
        { s: "D. Blakely", m: "Greetings, Tanner! How was your weekend? Are you doing the vegan chili thing? -Dick" },
        { s: "D. Blakely", m: "Do you need jackfruit? Are you using tempeh? Just beans? -Dick" },
        { s: "D. Blakely", m: "Let me know because I have to get rid of the beans I told you about. -Dick" },
        { s: "D. Blakely", m: "600lbs of beans I need to get rid of can you use them for Vegan Chili? -Dick" },
        { s: "D. Blakely", m: "URGENT! Tanner. Do you need my beans? I have 600lbs of them and I'm in hot water. -Dick" },
        { s: "D. Blakely", m: "Tanner. Beans. -Dick" },
        { s: "D. Blakely", m: "Tanner beans please do you need them are you here today -Dick" },
        { s: "D. Blakely", m: "Earth to Tanner. I sincerely need your help. 500lbs of beans are yours for free. -Dick" }
    ]
];

function startPodChatMonitor() {
    let lastChatTime = 0;
    let activePoolIndex = -1;
    let convoIndex = 0;
    
    // 1. Restore interrupted conversation state from previous sessions
    try {
        const savedState = JSON.parse(localStorage.getItem('podcube_chat_state'));
        if (savedState && savedState.poolIndex !== undefined) {
            activePoolIndex = savedState.poolIndex;
            convoIndex = savedState.convoIndex;
        }
    } catch (e) {}
    
    setInterval(() => {
        const now = Date.now();
        const idleTime = now - (AppState.lastCommandTime || now);
        
        // Threshold: 60,000ms (1 minute idle to begin observing chats)
        if (idleTime > 60000) {
            
            // Dynamic Delay: If they're in a back-and-forth conversation, they type faster (8 seconds).
            // If it's a random passing thought, it takes longer (20 seconds).
            const chatDelay = (activePoolIndex !== -1) ? 8000 : 20000;

            if (now - lastChatTime > chatDelay) {
                let chat = null;

                // 2. Are we currently playing out a multi-part conversation?
                if (activePoolIndex !== -1) {
                    const activeConversation = PRIC_CHAT_POOL[activePoolIndex];
                    
                    // Safety Check: Ensure the index still points to a valid array 
                    // (in case we added/removed chats in a future update)
                    if (Array.isArray(activeConversation) && convoIndex < activeConversation.length) {
                        chat = activeConversation[convoIndex];
                        convoIndex++;
                        
                        // Save progress, or clear it if the conversation just finished
                        if (convoIndex >= activeConversation.length) {
                            activePoolIndex = -1;
                            localStorage.removeItem('podcube_chat_state');
                        } else {
                            localStorage.setItem('podcube_chat_state', JSON.stringify({
                                poolIndex: activePoolIndex,
                                convoIndex: convoIndex
                            }));
                        }
                    } else {
                        // Data mismatch. Nuke the bad state and skip this tick.
                        activePoolIndex = -1;
                        localStorage.removeItem('podcube_chat_state');
                        return; 
                    }
                } 
                // 3. Otherwise, pull a random item from the pool
                else {
                    const pickIndex = Math.floor(Math.random() * PRIC_CHAT_POOL.length);
                    const pick = PRIC_CHAT_POOL[pickIndex];
                    
                    // If the random item is an array, start the conversation lock!
                    if (Array.isArray(pick)) {
                        activePoolIndex = pickIndex;
                        convoIndex = 1; // Queue up index 1 for next time
                        chat = pick[0]; // Play index 0 right now
                        
                        localStorage.setItem('podcube_chat_state', JSON.stringify({
                            poolIndex: activePoolIndex,
                            convoIndex: convoIndex
                        }));
                    } else {
                        // It's a standard solo message
                        chat = pick;
                    }
                }

                if (chat) {
                    const currentName = PodUser?.data?.username || "Passenger";
                    
                    // Replace all instances of "Tanner" (case-insensitive) with the current user's name
                    const personalizedMessage = chat.m.replace(/Tanner/gi, currentName);
                    const formattedMessage = `// ${chat.s.toUpperCase()}: ${personalizedMessage}`;
                    
                    logCommand(formattedMessage);
                    lastChatTime = now;
                }
            }
        }
    }, 5000); // Check every 5 seconds
}