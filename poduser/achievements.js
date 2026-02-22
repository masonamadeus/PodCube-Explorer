/**
 * achievements.js — PodCube Achievement Definitions
 *
 * Generated via PodCube Achievement Builder IDE
 */

window.addEventListener('PodCube:Ready', () => {

    PodUser.registerAchievement({
        id: 'first_transmission',
        title: 'Feed Explorer',
        desc: 'Listened to your first PodCube Transmission.',
        icon: '📡',
        condition: (data) => data.history.length >= 1,
        reward: {
            type: 'image',
            url: './poduser/assets/images/Time%20Eggnogstic.webp',
            caption: 'Thank you for choosing, or having already chosen, podcube™',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor',
        title: 'Dependable Asset',
        desc: 'Logged into the PodCube Explorer 5 separate times.',
        icon: '🖥️',
        condition: (data) => data.visits >= 5,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(16).webp',
            caption: 'PodCube Fun Fact!',
        }
    });

    PodUser.registerAchievement({
        id: 'first_punchcard',
        title: 'Record Keeper',
        desc: 'Printed your first Punchcard.',
        icon: '🖨️',
        condition: (data) => data.punchcards >= 1,
        reward: {
            type: 'image',
            url: './poduser/assets/images/Desk%20mic%20and%20paper.webp',
            caption: 'Making and sharing PodCube™ Punchcards is a great way to connect with friends!',
        }
    });

    PodUser.registerAchievement({
        id: 'game_gamer',
        title: 'Data Routing Expert',
        desc: 'Scored 5000 or higher in Adiabatic Dash.',
        icon: '🕹️',
        condition: (data) => (data.games['freaky-frogger'] || 0) >= 5000,
        reward: {
            type: 'video',
            url: './poduser/assets/video/%F0%9F%85%BF%EF%B8%8F.webm',
        }
    });

    PodUser.registerAchievement({
        id: 'circleday_song',
        title: 'We Built a Time Machine',
        desc: 'Celebrate with Ryan in the Far Future',
        condition: (data) => data.history.includes('47f946b5-45b7-4f35-9bc6-497e81332ee9'),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Circle%20Day%20(CrummyTrax).mp3',
                title: 'We Built a Time Machine',
                description: 'CrummyTrax Automated Song about Circle Day',
                model: 'CrummyTrax Automechanical Music Box',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '4220-01-15',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'precious_b_not_for_me',
        title: 'Trippin\' the Limbo',
        desc: 'Peek behind the fairgrounds',
        icon: '🚬',
        condition: (data) => data.history.includes('00a27e97-de89-4fc2-97e6-41215f70b955'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/Precious%20B.webp',
            caption: 'Also: dude toots? Not even once.',
        },
    });

});
