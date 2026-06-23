
(function () {
  'use strict';

  const KEY = 'commands_manager_panel_v4';
  const BTN_ID = 'cm_panel_btn';
  const PANEL_ID = 'cm_panel';

  const DEFAULTS = {
    mode: '普通',
    commands: [
      { title: '常駐', enabled: true, text: '$若有其他人物在场时，{{char}}需要赋予他们语言或者动作神态，用以推动剧情。\n$禁止为戏剧效果临时提升或降低角色、神器、NPC能力。\n$角色不得遗忘已确认事实、关系、身份与剧情结果。\n$优先使用世界书既有地名、势力、建筑与制度。\n$指令：只对赵语璃以外角色进行角色扮演\n$指令：禁止替赵语璃进行对话、发言、表情、动作和内心想法的描写。' },
      { title: '反史詩化', enabled: false, text: '$避免无意义夸张描写与史诗化套语。\n$禁止频繁使用「排山倒海」「海啸般」「洪流般」「撕裂神魂」「毁天灭地」「震碎虚空」等夸张表达。优先使用符合场景与人物能力的描写。' }
    ],
    modes: {
      '普通': '',
      '虐戀': '$当前为高烈度虐恋火葬场模式。允许强情绪爆发，但必须转化为行动、补救、牺牲与选择，禁止只重复痛苦、吐血、下跪、崩溃。',
      '神界': '$当前允许逐步触发神界线。神界信息必须通过神器异动、梦境、残卷、圣灵反应、轮回痕迹逐步揭露，不得让凡人角色无故全知。',
      '六界': '$当前允许使用六界暗线。六界设定仍需保持隐藏线逻辑，未被触发的角色不得突然知道真相。'
    }
  };

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();

  function findBox() {
    return document.querySelector('#send_textarea')
      || document.querySelector('#send_form textarea')
      || document.querySelector('textarea');
  }

  function setVal(el, val) {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function activeText() {
    const parts = [];
    for (const c of state.commands || []) {
      if (c.enabled && c.text && c.text.trim()) parts.push(c.text.trim());
    }
    const modeText = state.modes && state.modes[state.mode];
    if (modeText && modeText.trim()) parts.push(modeText.trim());
    return parts.join('\n');
  }

  function insertToBox() {
    const box = findBox();
    if (!box) {
      alert('搵唔到輸入框');
      return;
    }
    const text = activeText();
    if (!text.trim()) {
      alert('未有啟用指令');
      return;
    }
    const original = box.value || '';
    const mark = '<!-- COMMANDS_MANAGER -->';
    if (original.includes(mark)) {
      alert('已經插入過指令');
      return;
    }
    const finalText = original.trimEnd() + '\n\n' + mark + '\n' + text;
    setVal(box, finalText);
    alert('已加到正文最底');
  }

  function makeButton() {
    if (document.getElementById(BTN_ID)) return;
    const b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.textContent = '🎛';
    b.title = 'Commands Manager';
    b.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    };
    document.body.appendChild(b);
  }

  function makePanel() {
    if (document.getElementById(PANEL_ID)) return;
    const p = document.createElement('div');
    p.id = PANEL_ID;
    document.body.appendChild(p);
    render();
  }

  function togglePanel() {
    makePanel();
    const p = document.getElementById(PANEL_ID);
    p.classList.toggle('open');
  }

  function render() {
    const p = document.getElementById(PANEL_ID);
    if (!p) return;

    const modeNames = Object.keys(state.modes || DEFAULTS.modes);
    p.innerHTML = `
      <div class="cm-head">
        <b>🎛 指令面板</b>
        <button id="cm_close">×</button>
      </div>

      <div class="cm-block">
        <div class="cm-label">模式</div>
        <div id="cm_modes"></div>
      </div>

      <div class="cm-actions">
        <button id="cm_insert">插入到正文最底</button>
        <button id="cm_add">＋新增</button>
        <button id="cm_export">匯出</button>
        <button id="cm_import">匯入</button>
      </div>

      <textarea id="cm_import_box" placeholder="貼上匯出 JSON 後再按匯入" style="display:none;"></textarea>
      <div id="cm_list"></div>
    `;

    p.querySelector('#cm_close').onclick = () => p.classList.remove('open');
    p.querySelector('#cm_insert').onclick = insertToBox;
    p.querySelector('#cm_add').onclick = () => {
      state.commands.push({ title: '新指令', enabled: true, text: '$指令：' });
      save();
      render();
    };
    p.querySelector('#cm_export').onclick = async () => {
      const raw = JSON.stringify(state, null, 2);
      try {
        await navigator.clipboard.writeText(raw);
        alert('已複製');
      } catch {
        prompt('複製 JSON：', raw);
      }
    };
    p.querySelector('#cm_import').onclick = () => {
      const box = p.querySelector('#cm_import_box');
      if (box.style.display === 'none') {
        box.style.display = 'block';
        box.focus();
        return;
      }
      try {
        const next = JSON.parse(box.value);
        if (!Array.isArray(next.commands)) throw new Error('bad');
        state = Object.assign({}, DEFAULTS, next);
        save();
        render();
        alert('匯入完成');
      } catch {
        alert('JSON 格式錯誤');
      }
    };

    const modes = p.querySelector('#cm_modes');
    for (const name of modeNames) {
      const label = document.createElement('label');
      label.className = 'cm-mode';
      label.innerHTML = `<input type="radio" name="cm_mode"> ${name}`;
      label.querySelector('input').checked = state.mode === name;
      label.querySelector('input').onchange = () => {
        state.mode = name;
        save();
        render();
      };
      modes.appendChild(label);
    }

    const list = p.querySelector('#cm_list');
    (state.commands || []).forEach((cmd, i) => {
      const item = document.createElement('div');
      item.className = 'cm-item';
      item.innerHTML = `
        <div class="cm-row">
          <label><input class="cm-on" type="checkbox"> 用</label>
          <input class="cm-title" type="text">
          <button class="cm-up">↑</button>
          <button class="cm-down">↓</button>
          <button class="cm-del">刪</button>
        </div>
        <textarea class="cm-text"></textarea>
      `;
      item.querySelector('.cm-on').checked = !!cmd.enabled;
      item.querySelector('.cm-title').value = cmd.title || '';
      item.querySelector('.cm-text').value = cmd.text || '';

      item.querySelector('.cm-on').onchange = e => { cmd.enabled = e.target.checked; save(); };
      item.querySelector('.cm-title').oninput = e => { cmd.title = e.target.value; save(); };
      item.querySelector('.cm-text').oninput = e => { cmd.text = e.target.value; save(); };
      item.querySelector('.cm-del').onclick = () => {
        if (confirm('刪除？')) {
          state.commands.splice(i, 1);
          save();
          render();
        }
      };
      item.querySelector('.cm-up').onclick = () => {
        if (i > 0) {
          const x = state.commands.splice(i, 1)[0];
          state.commands.splice(i - 1, 0, x);
          save();
          render();
        }
      };
      item.querySelector('.cm-down').onclick = () => {
        if (i < state.commands.length - 1) {
          const x = state.commands.splice(i, 1)[0];
          state.commands.splice(i + 1, 0, x);
          save();
          render();
        }
      };
      list.appendChild(item);
    });
  }

  function boot() {
    makeButton();
    makePanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
