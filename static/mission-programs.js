window.missionPrograms = {};

window.missionPrograms.mission1a = [
    [ // node data
        { key: "Phase0", text: "Start", isGroup: true, category: "Pool" },
        { key: "Action0-1", text: "start", isGroup: true, group: "Phase0", color: "#FDF3CD" },
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
        { key: "Block2-1-3", text: "⏱  For 5 Minutes", group: "Action2-1", color: "#4D818E" },
        { key: "Action2-2", text: "next", isGroup: true, group: "Phase2", color: "#D2E0E3" },
        { key: "Block2-2-1", text: " If Depth >2 m ", group: "Action2-2", color: "#D2E0E3" },
        { key: "Block2-2-2", text: " Pause Video ", group: "Action2-2", color: "#7BA5AF" },
        { key: "Block2-2-3", text: "⏱  For 15 Minutes", group: "Action2-2", color: "#4D818E" },

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


window.missionPrograms.mission2a = [
    [ // node data
        { key: "Phase0", text: "Start", isGroup: true, category: "Pool" },
        { key: "Action0-1", text: "start", isGroup: true, group: "Phase0", color: "#FDF3CD" },
        { key: "Block0-1-1", text: " If Collar @ M2 ", group: "Action0-1", color: "#FDF3CD" },
        { key: "Block0-1-2", text: " Start Mission ", group: "Action0-1", color: "#FBDB6B" },

        { key: "Phase1", text: "Wait", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "no GPS", isGroup: true, group: "Phase1", color: "#D2E0E3" },
        { key: "Block1-1-1", text: "If GPS Signal" , group: "Action1-1", color: "#D2E0E3" },
        { key: "Block1-1-2", text: " Wait ", group: "Action1-1", color: "#7BA5AF" },

        { key: "Phase2", text: "Record", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "#D2E0E3" },
        { key: "Block2-1-1", text: "Timelapse Photos", group: "Action2-1", color: "#D2E0E3" },
        { key: "Block2-1-2", text: "⏱  Every 60 Secs", group: "Action2-1", color: "#7BA5AF" },

        { key: "Phase3", text: "End", isGroup: true, category: "Pool" },
        { key: "Action3-1", text: "end", isGroup: true, group: "Phase3", color: "#FAE6CE" },
        { key: "Block3-1-1", text: "If GPS Signal", group: "Action3-1", color: "#FAE6CE" },
        { key: "Block3-1-2", text: "End Mission", group: "Action3-1", color: "#F1B36F" },
    ],
    [ // link data
        { from: "Block0-1-1", to: "Block0-1-2" },
        { from: "Phase0", to: "Phase1" },

        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Phase1", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Phase2", to: "Phase3" },

        { from: "Block3-1-1", to: "Block3-1-2" },
    ]
];


