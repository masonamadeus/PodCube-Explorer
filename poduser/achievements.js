/**
 * achievements.js — PodCube Achievement Definitions
 * 
 * Visually arranged via PodCube Order Sorter
 */

window.addEventListener('PodCube:Ready', () => {


    PodUser.registerAchievement({
        id: 'first_transmission',
        title: 'Feed Explorer',
        desc: 'Listen to your first PodCube Transmission.',
        icon: '📡',
        order: 0,
        condition: (data) => data.history.length >= 1,
        reward: {
            type: 'image',
            url: './poduser/assets/images/Time%20Eggnogstic.webp',
            caption: 'Thank you for choosing, or having already chosen, podcube™',
        }
    });

    PodUser.registerAchievement({
        id: 'first_punchcard',
        title: 'Record Keeper',
        desc: 'Print your first Punchcard.',
        icon: '🖨️',
        order: 1,
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
        desc: 'Score 5000 or higher in Adiabatic Dash.',
        icon: '🕹️',
        order: 2,
        condition: (data) => (data.games['freaky-frogger'] || 0) >= 5000,
        reward: {
            type: 'video',
            url: './poduser/assets/video/%F0%9F%85%BF%EF%B8%8F.webm',
        }
    });

    PodUser.registerAchievement({
        id: 'burger_day_invite',
        title: 'Friends in Management',
        desc: 'Listen to transmissions from the P.R.I.C.',
        icon: '💼',
        order: 3,
        condition: (data) => data.history.filter(id => {
        const ep = window.PodCube?.findEpisode?.(id);
        return ep?.origin?.includes('Innovation Campus');
        }).length >= 3,
        reward: {
            type: 'image',
            url: './poduser/assets/images/BURGER%20DAY.webp',
            caption: 'No outside beverages allowed, Sprot™ will be available for purchase.',
        }
    });

    PodUser.registerAchievement({
        id: 'precious_b_not_for_me',
        title: 'Trippin\' the Limbo',
        desc: 'Peek behind the fairgrounds',
        icon: '🚬',
        order: 4,
        condition: (data) => data.history.includes('00a27e97-de89-4fc2-97e6-41215f70b955'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/Precious%20B.webp',
            caption: 'Also: dude toots? Not even once.',
        }
    });

    PodUser.registerAchievement({
        id: 'lance_lacer_psa',
        title: 'An Important PSA',
        desc: 'Get to know Twibbie™ Star Lance Lacer',
        icon: '📫',
        order: 5,
        condition: (data) => ['10657cf3-cf31-49a2-abce-7f7ab9a6ef61', 'c48444fa-b492-4c8a-8104-90027af60f27'].every(id => data.history.includes(id)),
        reward: {
            type: 'video',
            url: './poduser/assets/video/LanceLacerPSA.webm',
        }
    });

    PodUser.registerAchievement({
        id: 'chosen_older_relative_ad',
        title: 'Chosen Older Relative',
        desc: 'The Family Friendly Mobster Show on Twibbie™',
        icon: '🍴',
        order: 6,
        condition: (data) => data.history.includes('10657cf3-cf31-49a2-abce-7f7ab9a6ef61'),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PC%20CookIN%20Ads%20-%20Chosen%20Older%20Relative.mp3',
                title: 'The Chosen Older Relative (commercial)',
                description: 'Commercial for the hit new family-friendly, ultra-violent mobster show now airing on Twibbie™',
                model: 'Twibbie™ On Demand Streaming',
                origin: 'Twibbie™ On Demand Streaming',
                locale: 'Twibbie™ On Demand',
                region: 'Twibbie™ On Demand',
                zone: 'Twibbie™ On Demand',
                planet: 'Twibbie™ On Demand',
                date: '2048-01-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'chosen_older_relative_graphic',
        title: 'The Family-Friendly Mobster Show',
        desc: 'Twibbie™ On-Demand\'s Latest Ultra-Violent Series',
        icon: '🔪',
        order: 7,
        condition: (data) => {
        const c1 = data.history.includes('10657cf3-cf31-49a2-abce-7f7ab9a6ef61');
        const c2 = new Date().getDay() === 2;
        return c1 && c2;
        },
        reward: {
            type: 'image',
            url: './poduser/assets/images/ChosenOlderRelative.webp',
            caption: 'Every Tuesday Night on Twibbie™',
        }
    });

    PodUser.registerAchievement({
        id: 'dustys_commercial',
        title: 'That Time of Year Again',
        desc: 'Tractors, Shovels, Trowels, Friends, & Family',
        icon: '🍔',
        order: 8,
        condition: (data) => {
        const c1 = data.history.includes('5d56771c-cf4a-4006-a3de-bd391ed10f57');
        const c2 = data.history.filter(id => {
        const ep = window.PodCube?.findEpisode?.(id);
        return ep?.origin?.includes('burger trough');
        }).length >= 1;
        return c1 && c2;
        },
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Dusty%27s%20Burger%20Trough%20Ad_Spring1.mp3',
                title: 'Dusty\'s Burger Trough Spring Radio Ad',
                description: 'Dusty\'s springtime radio ad featuring Tommy Birthday',
                model: 'Top-Of-Mind Marketing Edition',
                origin: 'Moo-Moo Marketing Department, Dusty\'s Burger Trough',
                locale: 'Hartford',
                region: 'Wisconsin',
                zone: 'USA',
                planet: 'Earth',
                date: '2032-03-05',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'large_water_number',
        title: 'The Feel-Good Heist Movie',
        desc: 'Get HYPED for Twibbie™\'s Summer Blockbuster',
        icon: '🦷',
        order: 9,
        condition: (data) => data.history.includes('a6cfeba3-1a52-4c3a-ba31-b247fe6acac1'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/Large%20Water%20Number%20Graphic.webp',
            caption: 'All your favorite stars. All your favorite teeth.',
        }
    });

    PodUser.registerAchievement({
        id: 'dustys_music',
        title: 'Dusty\'s Barnyard Bash',
        desc: 'Where can you get twelve pounds of corn?',
        icon: '🌽',
        order: 10,
        condition: (data) => ['df644391-1afc-4876-9ee4-3107d5368ea6', '40f7f29e-357a-40cd-b46a-497e76363138', '5d56771c-cf4a-4006-a3de-bd391ed10f57', 'b7fcfdba-44e8-4457-ad07-e32bb4f1e92a'].every(id => data.history.includes(id)),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Dusty%27s%20Burger%20Trough%20(CrummyTrax).mp3',
                title: 'Dusty\'s Burger Trough Theme Song',
                description: 'CrummyTrax Automated Song about Dusty\'s Burger Trough',
                model: 'CrummyTrax Automechanical Music Box',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2048-07-30',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'monochrome_graphic',
        title: '50cc\'s of Pog Champ',
        desc: 'Every Monday Night on Twibbie™',
        icon: '⚕️',
        order: 11,
        condition: (data) => {
        const c1 = data.history.includes('10657cf3-cf31-49a2-abce-7f7ab9a6ef61');
        const c2 = new Date().getDay() === 1;
        return c1 && c2;
        },
        reward: {
            type: 'image',
            url: './poduser/assets/images/Monochrome%27s%20Analysis2.webp',
            caption: 'Monochrome\'s Analysis, starring Lance Lacer',
        }
    });

    PodUser.registerAchievement({
        id: 'monochrome_ad',
        title: 'Monochrome\'s Analysis',
        desc: 'Tune in Monday Nights on Twibbie™',
        icon: '⚕️',
        order: 12,
        condition: (data) => data.history.includes('10657cf3-cf31-49a2-abce-7f7ab9a6ef61'),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PC%20CookIN%20Ads%20-%20Monochrome%20Analysis%20Ad.mp3',
                title: 'Monochrome\'s Analysis',
                description: 'Commercial for the stunning new hospital drama streaming on Twibbie™',
                model: 'Twibbie™ On Demand Streaming',
                origin: 'Twibbie™ On Demand Streaming',
                locale: 'Twibbie™ On Demand Streaming',
                region: 'Twibbie™ On Demand Streaming',
                zone: 'Twibbie™ On Demand Streaming',
                planet: 'Twibbie™ On Demand Streaming',
                date: '2048-01-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'sprot_snort_psa',
        title: 'Drink It Normally',
        desc: 'Sample the new flavors of Sprot™',
        icon: '🍹',
        order: 13,
        condition: (data) => data.history.includes('ed5b0184-15ca-4457-adad-baca5ba9c226'),
        reward: {
            type: 'video',
            url: './poduser/assets/video/SPROT%20SNORT%20PSA.webm',
        }
    });

    PodUser.registerAchievement({
        id: 'regulation_camo',
        title: 'Military Strategist',
        desc: 'Report for uniform inspection, soldier.',
        icon: '🪖',
        order: 14,
        condition: (data) => data.history.includes('d85f55e5-7327-47d7-abbe-d64668678b7a'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/Regulation%20Camouflage.webp',
            caption: 'Email any unwanted Kohls Cash to PoweredByPodcube.com',
        }
    });

    PodUser.registerAchievement({
        id: 'seneschals_of_scion_intro',
        title: 'Seneschals of Scion',
        desc: 'Become fart-filled. Don\'t Teabag.',
        icon: '💨',
        order: 15,
        condition: (data) => data.history.includes('41f484d9-31d0-4e62-8388-6ac46ad6e8bd'),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/seneschals%20intro%20with%20mx.mp3',
                title: 'Seneschals of Scion Intro Sequence',
                description: 'First draft, internal use only',
                model: 'GG-EZ Solid State v.4',
                origin: 'Asset Production',
                locale: 'Turkey Face Games',
                region: '*',
                zone: 'USA',
                planet: 'Earth',
                date: '2022-02-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'seneschals_graphic',
        title: 'Seneschals of Scion Art',
        desc: 'Eventually we\'ll fix the bugs.',
        icon: '🍇',
        order: 16,
        condition: (data) => data.history.includes('41f484d9-31d0-4e62-8388-6ac46ad6e8bd'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/seneschals%20of%20scion.webp',
            caption: 'Maybe we should just make teabagging part of it.',
        }
    });

    PodUser.registerAchievement({
        id: 'missing_the_kissing',
        title: 'Missing the Kissing',
        desc: 'Remember All The Good Times in the Past',
        icon: '💋',
        order: 17,
        condition: (data) => ['11f81f38-b627-404e-94ef-17b5b7b78516', 'c4c2238e-bb19-42ca-a9d4-c4400fa3258e', '5bed71be-b8f2-4251-8f3b-a09b5599f535'].every(id => data.history.includes(id)),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Missing%20The%20Kissing%20(CrummyTrax).mp3',
                title: 'Missing the Kissing',
                description: 'CrummyTrax Automated Song about Traveling to the Past',
                model: 'CrummyTrax Automechanical Music Box',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '0001-01-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'burger_day_canceled',
        title: 'Maybe Next Year',
        desc: 'Listen to transmissions from the P.R.I.C.',
        icon: '❌',
        order: 18,
        condition: (data) => data.history.filter(id => {
        const ep = window.PodCube?.findEpisode?.(id);
        return ep?.origin?.includes('Innovation Campus');
        }).length >= 6,
        reward: {
            type: 'image',
            url: './poduser/assets/images/CANCELLED%20BURGER%20DAY.webp',
            caption: 'Please report to your personal physician at your soonest convenience.',
        }
    });

    PodUser.registerAchievement({
        id: 'dustys_meditation',
        title: 'Bottomless Peace & Serenity',
        desc: 'Dusty\'s Sponsored Wellness Break',
        icon: '🍗',
        order: 19,
        condition: (data) => ['df644391-1afc-4876-9ee4-3107d5368ea6', '40f7f29e-357a-40cd-b46a-497e76363138', '5d56771c-cf4a-4006-a3de-bd391ed10f57', 'b7fcfdba-44e8-4457-ad07-e32bb4f1e92a'].filter(id => data.history.includes(id)).length >= 3,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Dusty%27s%20Guided%20Meditation_FINAL.mp3',
                title: 'Guided Meditation (Sponsored by Dusty\'s Burger Trough)',
                description: 'Enjoy this relaxing spiritual experience, sponsored by America\'s Favorite Farm-Based Fast Food Establishment',
                model: 'Top-Of-Mind Marketing Edition',
                origin: 'Moo-Moo Marketing Department, Dusty\'s Burger Trough',
                locale: 'Hartford',
                region: 'Wisconsin',
                zone: 'USA',
                planet: 'Earth',
                date: '2043-07-24',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'mystical_jeremy_tent',
        title: 'It\'s In Tents',
        desc: 'Meet Mystical Jeremy',
        icon: '⛺',
        hiddenGoal: true,
        order: 20,
        condition: (data) => ['5bed71be-b8f2-4251-8f3b-a09b5599f535'].every(id => data.history.includes(id)),
        reward: {
            type: 'image',
            url: './poduser/assets/images/TentExterior.webp',
            caption: 'Art by Kevin Hinkle and Ben (Dog Paladin)',
        }
    });

    PodUser.registerAchievement({
        id: 'mystical_jeremy_malchistimo',
        title: 'This is My Apprentice',
        desc: 'Meet Malchistimo',
        icon: '🪄',
        order: 21,
        condition: (data) => data.history.includes('5bed71be-b8f2-4251-8f3b-a09b5599f535'),
        reward: {
            type: 'image',
            url: './poduser/assets/images/mystical%20jeremy%20and%20malchistimo.webp',
            caption: 'ARTIST: KEVIN HINKLE (KevinAHinkle.com)',
        }
    });

    PodUser.registerAchievement({
        id: 'circleday_song',
        title: 'We Built a Time Machine',
        desc: 'Celebrate with Ryan in the Far Future.',
        order: 22,
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
        id: 'eli_music_lofi',
        title: 'LoFi Cube to Defrigulate To',
        desc: 'Keep up with the Brads',
        icon: '🎵',
        order: 23,
        condition: (data) => ['ddc645b8-45c2-4c8d-b8f4-fb2403baa9c8', '07305a01-c665-48b5-b1f3-d5c1676c2942', 'd8496fcb-c9d3-45e2-adbb-3da3adf74192', '0f36c68c-7843-4446-95f0-535abfcb5904', 'c73f6f72-2e05-4995-95c8-052b27255489', 'e4499c0d-3364-47a6-a2f2-12d660d484c1', 'df644391-1afc-4876-9ee4-3107d5368ea6'].filter(id => data.history.includes(id)).length >= 6,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/LoFi%20Cube%20to%20Defrigulate%20To.mp3',
                title: 'LoFi Cube to Defrigulate To (Eli Rexford Chambers)',
                description: 'Created by Eli Rexford Chambers (eliwhodoesmusic.com)',
                model: 'Eli Rexford Chambers, Senior Harmonic Audio Resonance Technician',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'chris_ricepy_50_eps',
        title: 'Chris Ricepy',
        desc: 'Stunts & Stuff',
        icon: '🛹',
        order: 24,
        condition: (data) => data.history.length >= 50,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/CHRIS_RICEPY_EP1.mp3',
                title: 'Chris Ricepy Stunts & Stuff',
                description: 'One of the first transmissions picked up by an early PodCube™ unit.',
                model: 'Beta Build 0.5',
                origin: 'Chris Ricepy\'s Parents\' House',
                locale: 'Augusta',
                region: 'GA',
                zone: 'USA',
                planet: 'Earth',
                date: '2012-09-14',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'mystical_jeremy_concept',
        title: 'Freeform Secular Madrigals',
        desc: 'Keep up with Jeremy',
        icon: '🪄',
        order: 25,
        condition: (data) => ['c4c2238e-bb19-42ca-a9d4-c4400fa3258e', '5bed71be-b8f2-4251-8f3b-a09b5599f535'].every(id => data.history.includes(id)),
        reward: {
            type: 'image',
            url: './poduser/assets/images/Jeremy_character_exploration.webp',
            caption: 'Concept art by Ben (Dog Paladin)',
        }
    });

    PodUser.registerAchievement({
        id: 'cant_feel_my_feelings',
        title: 'Can\'t Feel My Feelings',
        desc: 'Ryan Briswold\'s Greatest Hit Song',
        icon: '🎸',
        order: 26,
        condition: (data) => data.history.includes('c03f18bc-74a1-4df4-bcf4-9a3c74c2c8d9'),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Cant%20Feel%20My%20Feelings_mixdown_final.mp3',
                title: 'Can\'t Feel My Feelings',
                description: 'Ryan Briswold\'s Dodeca-Platinum Global Bestselling Hit Track',
                model: 'TASCAM Blue Snowman',
                origin: 'SoundCave Recording Studios',
                locale: 'Ventura',
                region: 'CA',
                zone: 'USA',
                planet: 'Earth',
                date: '2038-06-19',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'caughtup_intro',
        title: 'PodCube™ Brand Kit',
        desc: 'Listen to Every Available Transmission',
        icon: '🏆',
        order: 27,
        condition: (data) => data.history.length >= PodCube.episodes.length,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PodCube_Notif1.mp3',
                title: 'PodCube™ Notification Sound',
                description: 'Created by Eli Rexford Chambers (eliwhodoesmusic.com)',
                model: 'Eli Rexford Chambers, Senior Harmonic Audio Resonance Technician',
                origin: 'PodCube Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'caughtup_intro_music',
        title: 'PodCube™ Intro Sequence',
        desc: 'Listen to every available transmission',
        icon: '🏆',
        hiddenGoal: true,
        order: 28,
        condition: (data) => data.history.length >= PodCube.episodes.length,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PodCube_Intro1.mp3',
                title: 'PodCube Intro Music',
                description: 'Created by Eli Rexford Chambers (eliwhodoesmusic.com)',
                model: 'Eli Rexford Chambers, Senior Harmonic Audio Resonance Technician',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'caughtup_outro_music',
        title: 'PodCube™ Outro Sequence',
        desc: 'Listen to every available transmission',
        icon: '🏆',
        hiddenGoal: true,
        order: 29,
        condition: (data) => data.history.length >= PodCube.episodes.length,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PodCube_Outro1.mp3',
                title: 'PodCube Outro Music',
                description: 'Created by Eli Rexford Chambers (eliwhodoesmusic.com)',
                model: 'Eli Rexford Chambers, Senior Harmonic Audio Resonance Technician',
                origin: 'PodCube Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'thats_basically_improv',
        title: 'That\'s Basically Improv',
        desc: 'Listen to 75 Transmissions',
        icon: '🏆',
        order: 30,
        condition: (data) => data.history.length >= 75,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/thats%20basically%20improv.mp3',
                title: 'And That\'s Something We Call Improv',
                description: 'A blooper from some unknown origin',
                model: 'P.R.I.C. Internal Staff Recorder',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'sal_sauceworld',
        title: 'Salvatore Solitaro\'s Legacy',
        desc: 'The Saucy Dog Himself',
        icon: '🏆',
        order: 31,
        condition: (data) => ['10657cf3-cf31-49a2-abce-7f7ab9a6ef61', 'e7cba5b6-e17c-40ba-8297-970c5cc9dab6'].every(id => data.history.includes(id)),
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/PC%20CookIN%20Ads%20-%20Sal%20Sauceworld.mp3',
                title: 'Sal\'s Sauceworld (commercial)',
                description: 'Twibbie™ On Demand has officially cut ties with Salvatore Solitaro following a legal incident.',
                model: 'Twibbie™ On Demand Streaming',
                origin: 'Twibbie™ On Demand Streaming',
                locale: 'Twibbie™ On Demand',
                region: 'Twibbie™ On Demand',
                zone: 'Twibbie™ On Demand',
                planet: 'Twibbie™ On Demand',
                date: '2057-12-21',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'eli_music_warm',
        title: 'Warm Cube Summer',
        desc: 'Listen in at Wexton Industries',
        icon: '🎶',
        order: 32,
        condition: (data) => data.history.filter(id => {
        const ep = window.PodCube?.findEpisode?.(id);
        return ep?.origin?.includes('Wexton');
        }).length >= 10,
        reward: {
            type: 'audio',
            meta: {
                url: './poduser/assets/audio/Warm%20Cube%20Summer.mp3',
                title: 'Warm Cube Summer (Eli Chambers)',
                description: 'Created by Eli Rexford Chambers (eliwhodoesmusic.com)',
                model: 'Eli Rexford Chambers, Senior Harmonic Audio Resonance Technician',
                origin: 'PodCube™ Research & Innovation Campus',
                locale: 'Miami',
                region: 'FL',
                zone: 'USA',
                planet: 'Earth',
                date: '2021-10-01',
            }
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_5',
        title: 'PodCube™ Passenger',
        desc: 'Log into the PodCube Explorer 5 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 33,
        condition: (data) => data.visits >= 5,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(16).webp',
            caption: 'PodCube Fun Fact!',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_10',
        title: 'PodCube™ Afficionado',
        desc: 'Log in to PodCube Explorer 10 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 34,
        condition: (data) => data.visits >= 10,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(15).webp',
            caption: 'PodCube will also never request a code from you, unless explicitly asked.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_15',
        title: 'PodCube™ Pal',
        desc: 'Log in to PodCube™ Explorer 15 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 35,
        condition: (data) => data.visits >= 15,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(20).webp',
            caption: 'Sometimes, the customer is not right.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_20',
        title: 'PodCube™ Associate',
        desc: 'Log in to PodCube™ Explorer 20 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 36,
        condition: (data) => data.visits >= 20,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(6).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_25',
        title: 'PodCube™ Enthusiast',
        desc: 'Log in to PodCube™ Explorer 25 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 37,
        condition: (data) => data.visits >= 25,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(1).webp',
            caption: 'Do not look directly at the condensation.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_30',
        title: 'PodCube™ Supporter',
        desc: 'Log in to PodCube™ Explorer 30 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 38,
        condition: (data) => data.visits >= 30,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(2).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_35',
        title: 'PodCube™ Advocate',
        desc: 'Log in to PodCube™ Explorer 35 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 39,
        condition: (data) => data.visits >= 35,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(3).webp',
            caption: 'We monitor everything, for your convenience.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_40',
        title: 'PodCube™ Specialist',
        desc: 'Log in to PodCube™ Explorer 40 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 40,
        condition: (data) => data.visits >= 40,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(4).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_45',
        title: 'PodCube™ Executive',
        desc: 'Log in to PodCube™ Explorer 45 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 41,
        condition: (data) => data.visits >= 45,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(5).webp',
            caption: 'Brigistics takes no responsibility for lost time.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_50',
        title: 'PodCube™ Partner',
        desc: 'Log in to PodCube™ Explorer 50 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 42,
        condition: (data) => data.visits >= 50,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(7).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_55',
        title: 'PodCube™ VIP',
        desc: 'Log in to PodCube™ Explorer 55 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 43,
        condition: (data) => data.visits >= 55,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(8).webp',
            caption: 'Fun Fact: You cannot prove you weren\'t here yesterday.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_60',
        title: 'PodCube™ Connoisseur',
        desc: 'Log in to PodCube™ Explorer 60 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 44,
        condition: (data) => data.visits >= 60,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(9).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_65',
        title: 'PodCube™ Inspector',
        desc: 'Log in to PodCube™ Explorer 65 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 45,
        condition: (data) => data.visits >= 65,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(10).webp',
            caption: 'If it smells like ozone, please close the application.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_70',
        title: 'PodCube™ Supervisor',
        desc: 'Log in to PodCube™ Explorer 70 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 46,
        condition: (data) => data.visits >= 70,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(11).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_75',
        title: 'PodCube™ Director',
        desc: 'Log in to PodCube™ Explorer 75 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 47,
        condition: (data) => data.visits >= 75,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(12).webp',
            caption: 'PodCube™ is legally distinct from magic.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_80',
        title: 'PodCube™ VP',
        desc: 'Log in to PodCube™ Explorer 80 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 48,
        condition: (data) => data.visits >= 80,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(13).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_85',
        title: 'PodCube™ Shareholder',
        desc: 'Log in to PodCube™ Explorer 85 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 49,
        condition: (data) => data.visits >= 85,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(14).webp',
            caption: 'Your continued compliance is highly valued.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_90',
        title: 'PodCube™ Board Member',
        desc: 'Log in to PodCube™ Explorer 90 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 50,
        condition: (data) => data.visits >= 90,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(17).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_95',
        title: 'PodCube™ Chairman',
        desc: 'Log in to PodCube™ Explorer 95 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 51,
        condition: (data) => data.visits >= 95,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(18).webp',
            caption: 'Please ignore the subtle hum.',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_100',
        title: 'PodCube™ Legend',
        desc: 'Log in to PodCube™ Explorer 100 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 52,
        condition: (data) => data.visits >= 100,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(19).webp',
        }
    });

    PodUser.registerAchievement({
        id: 'frequent_visitor_105',
        title: 'PodCube™ Deity',
        desc: 'Log in to PodCube™ Explorer 105 separate times.',
        icon: '🖥️',
        hiddenGoal: true,
        order: 53,
        condition: (data) => data.visits >= 105,
        reward: {
            type: 'image',
            url: './poduser/assets/images/PodCube%20Fact%20(21).webp',
            caption: 'You have seen too much.',
        }
    });


});