class RainbowRoom {
    static LGT = [
      `%cRainbowRoom`,
      `color: #008000; font-weight: bold;`,
      `|`,
    ];

    static ID = 'rainbowroom';
    
    static colorArray = ['0000FF','FFFF00','00FFFF','FF00FF','FF0000','00FF00','000000','FFFFFF','808000','800000', 'C0C0C0']
    
    static FLAGS = {
      BORDERCOLOR: 'BorderColor'
    }
    
    static TEMPLATES = {
      RAINBOWROOM: `modules/${this.ID}/templates/rainbowroom.hbs`
    }
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (shouldLog) {
          console.log(...this.LGT, ...args);
        }
    }

    static Colorize(token){
      let borderColor = Color.from(token.document.getFlag(RainbowRoom.ID, RainbowRoom.FLAGS.BORDERCOLOR))
      this.log(false, `Entering Colorize: token ${token.document.name}: border color is ${token.border._lineStyle.color} and should be ${borderColor.valueOf()}`)
      
      // Bail if we don't have an assigned boderColor
      if (!borderColor || isNaN(borderColor)) {
        this.log(false, "No border color defined, bailing.")
        return;
      }

      this.log(false, `Updating token ${token.document.name} border color to ${borderColor.valueOf()}`)
      const t = 20; //border thickness
      const sB = 1; //scale border
      const nBS = canvas.dimensions.size / 100 //border grid scale (usually 1)
      const p = 8 // border offfset negative for inside
      const q = Math.round(p / 2)
      const h = Math.round(t / 2);
      const o = Math.round(h / 2);
      const s = 1 // scale
      const sW = sB ? (token.w - (token.w * s)) / 2 : 0
      const sH = sB ? (token.h - (token.h * s)) / 2 : 0

      // PIXI.lineStyle (width, color, alpha).drawRoundedRect (x, y, width, height, radius)
      token.border.lineStyle(h * nBS, borderColor.valueOf(), 1.0).drawRoundedRect(-o - q + sW, -o - q + sH, (token.w + h) * s + p, (token.h + h) * s + p, 3);
      // Only needed until https://github.com/foundryvtt/foundryvtt/issues/8364 is fixed
      token.border.position.set(token.document.x, token.document.y); 
    }

    static UpdateSight() {
      // Hide any token borders if the tokens can't be seen
      canvas.tokens.placeables.forEach(t => {
        if (!t.visible) {
          this.log(false, `Token ${t.document.name} is not visible, hiding.`)
          t.border.visible = false;
        } else {
          t.border.visible = true;
        }
      })
    }

    static _handleRenderFormApplication(app, html) {
      if (app.constructor.name !== "TokenConfig") return;
      let borderColor = app.document.getFlag(RainbowRoom.ID, RainbowRoom.FLAGS.BORDERCOLOR)
      if (borderColor === undefined || borderColor.length == 0) {
        borderColor = "";
      } else {
        RainbowRoom.log(false, "Converting borderColor from css: ", borderColor)
        borderColor = Color.from(borderColor).css
      }
      const elem = html.find(`div[data-tab="appearance"]`);
      const borderColorFlagName = `flags.${RainbowRoom.ID}.${RainbowRoom.FLAGS.BORDERCOLOR}`
      const buttonTitle = game.i18n.localize('RAINBOWROOM.button-title')
      elem.append(`
        <div class="form-group">
          <label>${buttonTitle}</label>
          <div class="form-fields">
              <input class="color" type="text" name="${borderColorFlagName}" value="${borderColor}">
              <button type="button" title="Clear Border" data-action="clear" class="flex0 rainbowroom-icon-button">
        <i class="fas fa-eraser"></i>
        </button>
              <input type="color" value="${borderColor}" data-edit="${borderColorFlagName}">
          </div>
        </div>`);
        html.find('button').click(function (event) {
          const clickedElement = $(event.currentTarget);
          const action = clickedElement.data().action;
          if (action === "clear") {
            RainbowRoom.log(false, "Clearing borderColor flag")
            app.document.unsetFlag(RainbowRoom.ID, RainbowRoom.FLAGS.BORDERCOLOR)
          }
        });
    }

    static initializeControls(controls) {
      const tokenButton = controls.find((control) => control.name === 'token');
      if (!tokenButton) return;
      tokenButton.tools.push({
        name: 'colorize-borders',
        title: game.i18n.localize("RAINBOWROOM.ControlBtns.Label_Colorize"),
        icon: 'fas fa-layer-plus',
        button: true,
        visible: true,
        onClick: RainbowRoom.assignUniqueColors,
      });
      tokenButton.tools.push({
        name: 'clear-borders',
        title: game.i18n.localize("RAINBOWROOM.ControlBtns.Label_Clear"),
        icon: 'fas fa-layer-minus',
        button: true,
        visible: true,
        onClick: RainbowRoom.clearBorders,
      });
    }

    static assignUniqueColors() {
      RainbowRoom.log(false, "Assigning Unique Colors")
      let selectedTokens = canvas.tokens.controlled;
      if (selectedTokens.length == 0) {
        ui.notifications.warn(game.i18n.localize("RAINBOWROOM.ui-warn-color-noneselected"));
        return;
      }
      let colorIndex = 0;
      selectedTokens.forEach(token => {
        token.document.setFlag(RainbowRoom.ID, RainbowRoom.FLAGS.BORDERCOLOR, RainbowRoom.colorArray[colorIndex])
        colorIndex++;
        if (colorIndex > colorIndex.length) colorIndex = 0;
      });
    }

    static clearBorders() {
      RainbowRoom.log(false, "Clearing Borders")
      let selectedTokens = canvas.tokens.controlled;
      if (selectedTokens.length == 0) {
        ui.notifications.warn(game.i18n.localize("RAINBOWROOM.ui-warn-clear-noneselected"));
        return;
      }
      selectedTokens.forEach(token => {
        token.document.unsetFlag(RainbowRoom.ID, RainbowRoom.FLAGS.BORDERCOLOR)
      });
    }
  }


// Hooks into Foundry
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(RainbowRoom.ID);
});

Hooks.on("refreshToken", (token) => {
  RainbowRoom.Colorize(token);
});

Hooks.on("sightRefresh", (canvasVis) => {
  RainbowRoom.UpdateSight();
});

Hooks.on("renderFormApplication", RainbowRoom._handleRenderFormApplication);

Hooks.on("getSceneControlButtons", (controls) => { 
  if (game.user.isGM) RainbowRoom.initializeControls(controls);
});