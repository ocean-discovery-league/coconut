window.missionPrograms = {};

window.missionPrograms.mission1a = [
    [ // node data
        { key: "Phase0", text: "Start", isGroup: true, category: "Pool" },
        { key: "Action0-1", text: "depth", isGroup: true, group: "Phase0", color: "#FDF3CD" },
        { key: "Block0-1-1", text: " If Collar @ M1 ", group: "Action0-1", color: "#FDF3CD" },
        { key: "Block0-1-2", text: " Start Mission ", group: "Action0-1", color: "#FBDB6B" },

        { key: "Phase1", text: "Phase 1", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "depth", isGroup: true, group: "Phase1", color: "#D2E0E3" },
        { key: "Block1-1-1", text: " If Depth <2 m ", group: "Action1-1", color: "#D2E0E3" },
        { key: "Block1-1-2", text: " Wait ", group: "Action1-1", color: "#7BA5AF" },

        { key: "Phase2", text: "Phase 2", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "#D2E0E3" },
        { key: "Block2-1-1", text: " If Depth >2 m ", group: "Action2-1", color: "#D2E0E3" },
        { key: "Block2-1-2", text: " Record Video ", group: "Action2-1", color: "#7BA5AF" },
        { key: "Block2-1-3", text: "⏱ 5min", group: "Action2-1", color: "#4D818E" },
        { key: "Action2-2", text: "next", isGroup: true, group: "Phase2", color: "#D2E0E3" },
        { key: "Block2-2-1", text: " If Depth >2 m ", group: "Action2-2", color: "#D2E0E3" },
        { key: "Block2-2-2", text: " Pause Video ", group: "Action2-2", color: "#7BA5AF" },
        { key: "Block2-2-3", text: "⏱ 15min", group: "Action2-2", color: "#4D818E" },

        { key: "Phase3", text: "End", isGroup: true, category: "Pool" },
        { key: "Action3-1", text: "end", isGroup: true, group: "Phase3", color: "#FAE6CE" },
        { key: "Block3-1-1", text: " If Depth <2 m ", group: "Action3-1", color: "#FAE6CE" },
        { key: "Block3-1-2", text: "End Mission", group: "Action3-1", color: "#F1B36F" },
    ],
    [ // link data
        { from: "Block0-1-1", to: "Block0-1-2" },
        { from: "Phase0", to: "Phase1" },

        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Phase1", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Block2-1-2", to: "Block2-1-3" },

	{ from: "Block2-2-1", to: "Block2-2-2" },
        { from: "Block2-2-2", to: "Block2-2-3" },

        { from: "Block2-1-2", to: "Block2-2-2" },
        { from: "Block2-2-2", to: "Block2-1-2" },
        { from: "Phase2", to: "Phase3" },

        { from: "Block3-1-1", to: "Block3-1-2" },
    ]
];

window.missionPrograms.mission1b = [
    [ // node data
        { key: "Phase1", text: "Wait", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "depth", isGroup: true, group: "Phase1", color: "#D2E0E3" },
        { key: "Block1-1-1", text: " > 2m ", group: "Action1-1" },
        { key: "Block1-1-2", text: " Next Phase ", group: "Action1-1" },

        { key: "Phase2", text: "Record", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "lightgreen" },
        { key: "Block2-1-1", text: "🔁 5sec", group: "Action2-1", color: "lightgreen"},
        { key: "Block2-1-2", text: "▶️  Photo", group: "Action2-1", color: "lightgreen"},
        { key: "Action2-3", text: "end", isGroup: true, group: "Phase2", color: "orange" },
        { key: "Block2-3-1", text: "> 200m", group: "Action2-3" },
        { key: "Block2-3-2", text: "End Mission", group: "Action2-3", color: "red" },
    ],
    [ // link data
        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Block1-1-2", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Block2-2-1", to: "Block2-2-2" },
        { from: "Block2-2-2", to: "Phase3" },
        { from: "Block2-3-1", to: "Block2-3-2" },
    ]
];


window.missionPrograms.mission2a = [
    [ // node data
        { key: "Phase1", text: "Wait", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "no GPS", isGroup: true, group: "Phase1", color: "lightblue" },
        { key: "Block1-1-1", text: "❌📡" , group: "Action1-1" },
        { key: "Block1-1-2", text: " Next Phase ", group: "Action1-1" },

        { key: "Phase2", text: "Record", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "lightgreen" },
        { key: "Block2-1-1", text: "🔁 5sec", group: "Action2-1", color: "lightgreen"},
        { key: "Block2-1-2", text: "🔃 iso,exp,speed", group: "Action2-1", color: "lightgreen"},
        { key: "Block2-1-3", text: "▶️  Photo", group: "Action2-1", color: "lightgreen"},
        { key: "Action2-2", text: "end", isGroup: true, group: "Phase2", color: "orange" },
        { key: "Block2-2-1", text: "✔️📡", group: "Action2-2" },
        { key: "Block2-2-2", text: "End Mission", group: "Action2-2", color: "red" },

    ],
    [ // link data
        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Block1-1-2", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Block2-1-2", to: "Block2-1-3" },

        { from: "Block2-2-1", to: "Block2-2-2" },
    ]
];

window.missionPrograms.mission2b = [
    [ // node data
        { key: "Phase1", text: "Wait", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "depth", isGroup: true, group: "Phase1", color: "lightblue" },
        { key: "Block1-1-1", text: " > 2m ", group: "Action1-1" },
        { key: "Block1-1-2", text: " Next Phase ", group: "Action1-1" },

        { key: "Phase2", text: "Record", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "lightgreen" },
        { key: "Block2-1-1", text: "🔁 5sec", group: "Action2-1", color: "lightgreen"},
        { key: "Block2-1-2", text: "▶️  Photo", group: "Action2-1", color: "lightgreen"},
        { key: "Action2-3", text: "end", isGroup: true, group: "Phase2", color: "orange" },
        { key: "Block2-3-1", text: "> 200m", group: "Action2-3" },
        { key: "Block2-3-2", text: "End Mission", group: "Action2-3", color: "red" },
    ],
    [ // link data
        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Block1-1-2", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Block2-2-1", to: "Block2-2-2" },
        { from: "Block2-2-2", to: "Phase3" },
        { from: "Block2-3-1", to: "Block2-3-2" },
    ]
];


