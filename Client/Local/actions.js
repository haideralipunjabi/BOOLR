let actions = [];

class Action {
    constructor(method,data) {
        this.method = method;
        this.data = data;

        switch(method) {
            case "add":
                const component = components[data[0]];

                if(socket) {
                    send("add", stringify({components: [component] }));
                }

                if(component.constructor == Wire) {
                    toolbar.message(`Added a connection between ${component.from.name} and ${component.to.name}`, "action")
                } else {
                    toolbar.message(`Added ${component.name}`, "action")
                }
                break;
            case "remove":
                if(data.length > 1) {
                    toolbar.message(`Removed selection`, "action");
                } else {
                    if(socket) {
                        send("remove", components.indexOf(data[0]));
                    }

                    const component = data[0];
                    if(component.constructor == Wire) {
                        toolbar.message(`Removed a connection between ${component.from.name} and ${component.to.name}`, "action")
                    } else {
                        toolbar.message(`Removed ${component.name}`, "action")
                    }
                }
                break;
            case "edit":
                if(socket) {
                    let dat = Object.assign({}, data);
                    dat.component = components.indexOf(dat.component);
                    send("edit", dat);
                }
                toolbar.message("Edited property '" +
                    data.property +
                    "' of " +
                    (data.property == "name" ? data.oldValue : data.component.name),
                    "action"
                );
                break;
        }
    }
}

function undo() {
    if(!actions.length) return;

    const action = actions.splice(-1)[0];
    switch(action.method) {
        case "add":
            for(let i = 0; i < action.data.length; ++i) {
                const component = components[action.data[i]];
                if(component.constructor == Wire) {
                    component.from && component.from.output.splice(component.from.output.indexOf(component),1);
                    component.to && component.to.input.splice(component.to.input.indexOf(component),1);
                }
                components.splice(action.data[i],1);
            }
            break;
        case "remove":
            for(let i = 0; i < action.data.length; ++i) {
                if(action.data[i].constructor == Wire) {
                    const wire = action.data[i];
                    connect(wire.from,wire.to,wire);
                    components.unshift(wire);
                } else {
                    components.push(action.data[i]);
                }
            }
            break;
        case "remove_selection":
            const old_clipbord = Object.assign({}, clipbord);
            clipbord = action.data;
            clipbord.paste(clipbord.selection.x,clipbord.selection.y);
            setTimeout(() => clipbord = old_clipbord ,2);
            break;
        case "edit":
            console.log(data);
            data.component[data.property] = data.oldValue;
            break;
        case "move":
            action.data.components[0].pos.x = action.data.pos.x;
            action.data.components[0].pos.y = action.data.pos.y;
            break;
        case "move_selection":
            selecting = action.data.selection;
            contextMenu.show({ x: (selecting.x + selecting.w - offset.x) * zoom, y: -(selecting.y + selecting.h - offset.y) * zoom });

            for(let i of action.data.components) {
                if(Array.isArray(i.pos)) {
                    for(let j of i.pos) {
                        j.x = j.x - selecting.x + action.data.pos.x;
                        j.y = j.y - selecting.y + action.data.pos.y;
                    }
                } else {
                    i.pos.x = i.pos.x - selecting.x + action.data.pos.x;
                    i.pos.y = i.pos.y - selecting.y + action.data.pos.y;
                }
            }

            selecting.x = action.data.pos.x;
            selecting.y = action.data.pos.y;
            contextMenu.pos.x = selecting.x + selecting.w;
            contextMenu.pos.y = selecting.y + selecting.h;
            break;
    }
}