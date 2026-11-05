(function () {
  'use strict';

  /* =========================================================
   * 配置区
   * =======================================================*/
  const CONFIG = {
    engines: {
      bing:   { label: 'Bing',   menuLabel: 'Microsoft Bing', icon: 'icon-bing',        search: 'https://www.bing.com/search?q=' },
      google: { label: 'Google', menuLabel: 'Google',         icon: 'icon-logo-google', search: 'https://www.google.com/search?q=' }
    },
    defaultEngine: 'bing',

    defaultSites: [
      { name: '哔哩哔哩', url: 'https://www.bilibili.com/' },
      { name: 'GitHub',   url: 'https://github.com/' },
      { name: 'Deepseek', url: 'https://chat.deepseek.com/' },
      { name: 'Pixiv',    url: 'https://www.pixiv.net/' },
      { name: 'AO3',      url: 'https://archiveofourown.org/' }
    ],

    // 调试入口初始数据（首次访问使用，之后以 localStorage 为准）
    defaultDebugRows: [
      {
        ip: '127.0.0.1',
        ports: [
          { name: '8080', port: 8080, protocol: 'http' }
        ]
      }
    ],

    defaultTheme: 'system',

    defaultBackground: {
      url: 'https://uapis.cn/api/v1/image/bing-daily',
      blur: 6
    },

    keys: {
      engine: 'homepage.engine',
      sites:  'homepage.sites',
      debug:  'homepage.debug',
      background: 'homepage.background',
      backgroundRefresh: 'homepage.background.refresh',
      theme: 'homepage.theme'
    }
  };

  const FAVICON_CACHE = 'homepage-favicons-v2';

  /* =========================================================
   * 本地存储
   * =======================================================*/
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  /* =========================================================
   * 时钟 / 日期
   * =======================================================*/
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    const now = new Date();
    clockEl.textContent =
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    dateEl.textContent =
      now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日' +
      ' 星期' + WEEK[now.getDay()];
  }

  tick();
  setInterval(tick, 1000);

  /* =========================================================
   * 搜索引擎
   * =======================================================*/
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const engineSwitch = document.getElementById('engineSwitch');

  let engine = store.get(CONFIG.keys.engine, CONFIG.defaultEngine);
  if (!CONFIG.engines[engine]) engine = CONFIG.defaultEngine;

  function renderEngineSwitch() {
    engineSwitch.innerHTML = '';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'engine-trigger';
    trigger.setAttribute('aria-label', '选择搜索引擎，当前为 ' + CONFIG.engines[engine].label);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML =
      '<span class="iconfont ' + CONFIG.engines[engine].icon + '" aria-hidden="true"></span>' +
      '<span class="engine-chevron" aria-hidden="true"></span>';

    const menu = document.createElement('div');
    menu.className = 'engine-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    trigger.addEventListener('click', function () {
      const isOpen = !menu.hidden;
      menu.hidden = isOpen;
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    Object.keys(CONFIG.engines).forEach(function (key) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'engine-option' + (key === engine ? ' active' : '');
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', String(key === engine));
      btn.setAttribute('aria-label', CONFIG.engines[key].menuLabel);
      btn.title = CONFIG.engines[key].menuLabel;
      btn.innerHTML =
        '<span class="iconfont ' + CONFIG.engines[key].icon + '" aria-hidden="true"></span>' +
        '<span class="engine-option-label">' + CONFIG.engines[key].menuLabel + '</span>';
      btn.addEventListener('click', function () {
        engine = key;
        store.set(CONFIG.keys.engine, key);
        renderEngineSwitch();
      });
      menu.appendChild(btn);
    });

    engineSwitch.appendChild(trigger);
    engineSwitch.appendChild(menu);
  }

  document.addEventListener('click', function (event) {
    if (engineSwitch.contains(event.target)) return;
    const menu = engineSwitch.querySelector('.engine-menu');
    const trigger = engineSwitch.querySelector('.engine-trigger');
    if (menu && !menu.hidden) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  function isUrlLike(text) {
    if (/\s/.test(text)) return false;
    if (/^https?:\/\//i.test(text)) return true;
    return /^[\w.-]+(:\d+)?(\/\S*)?$/.test(text) && /[.:]/.test(text);
  }

  function openUrl(url) {
    window.location.href = /^https?:\/\//i.test(url) ? url : 'http://' + url;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    if (isUrlLike(q)) openUrl(q);
    else window.location.href = CONFIG.engines[engine].search + encodeURIComponent(q);
  });

  renderEngineSwitch();

  /* =========================================================
   * 主题
   * =======================================================*/
  const themeInputs = document.querySelectorAll('input[name="theme"]');
  let theme = store.get(CONFIG.keys.theme, CONFIG.defaultTheme);
  if (['light', 'dark', 'system'].indexOf(theme) === -1) theme = 'system';

  function applyTheme() {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    themeInputs.forEach(function (input) { input.checked = input.value === theme; });
  }

  themeInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      theme = input.value;
      store.set(CONFIG.keys.theme, theme);
      applyTheme();
    });
  });

  applyTheme();

  /* =========================================================
   * 背景
   * =======================================================*/
  const backgroundEditBtn = document.getElementById('backgroundEditBtn');
  const backgroundSettings = document.getElementById('backgroundSettings');
  const backgroundUrlInput = document.getElementById('backgroundUrl');
  const backgroundBlurInput = document.getElementById('backgroundBlur');
  const backgroundBlurValue = document.getElementById('backgroundBlurValue');
  const backgroundSaveBtn = document.getElementById('backgroundSave');
  const backgroundClearBtn = document.getElementById('backgroundClear');
  const backgroundFileBtn = document.getElementById('backgroundFileBtn');
  const backgroundFileInput = document.getElementById('backgroundFile');
  const backgroundFileStatus = document.getElementById('backgroundFileStatus');

  let background = store.get(CONFIG.keys.background, CONFIG.defaultBackground);
  if (!background || typeof background !== 'object') background = { url: '', blur: 0 };
  background.url = typeof background.url === 'string' ? background.url : '';
  background.blur = Math.min(24, Math.max(0, Number(background.blur) || 0));

  function updateBlurLabel() {
    backgroundBlurValue.textContent = backgroundBlurInput.value + 'px';
  }

  function setIconButton(button, iconClass, label) {
    button.innerHTML = '<span class="iconfont ' + iconClass + '" aria-hidden="true"></span>';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function backgroundDay() {
    const now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function isRemoteBackground(url) {
    return /^https?:\/\//i.test(url);
  }

  function getBackgroundRefresh() {
    const refresh = store.get(CONFIG.keys.backgroundRefresh, null);
    if (!refresh || typeof refresh !== 'object') return { date: '', remote: false };
    return {
      date: typeof refresh.date === 'string' ? refresh.date : '',
      remote: refresh.remote === true
    };
  }

  function hasRefreshedBackgroundToday(url) {
    const refresh = getBackgroundRefresh();
    return isRemoteBackground(url) && refresh.remote && refresh.date === backgroundDay();
  }

  function markBackgroundRefreshed(url) {
    store.set(CONFIG.keys.backgroundRefresh, {
      date: backgroundDay(),
      remote: isRemoteBackground(url)
    });
  }

  function dailyBackgroundUrl(url, refreshToday) {
    if (!refreshToday) return url;
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('homepage-background-day', backgroundDay());
      return parsed.href;
    } catch (e) {
      return url;
    }
  }

  function applyBackground() {
    const refreshToday = isRemoteBackground(background.url) && !hasRefreshedBackgroundToday(background.url);
    const imageUrl = dailyBackgroundUrl(background.url, refreshToday);
    if (refreshToday) {
      markBackgroundRefreshed(background.url);
    }
    document.documentElement.style.setProperty('--background-image', imageUrl ? 'url("' + imageUrl.replace(/"/g, '\\"') + '")' : 'none');
    document.documentElement.style.setProperty('--background-blur', background.blur + 'px');
    document.body.classList.toggle('has-background', Boolean(background.url));
  }

  function populateBackgroundForm() {
    backgroundUrlInput.value = background.url;
    backgroundBlurInput.value = background.blur;
    updateBlurLabel();
  }

  backgroundEditBtn.addEventListener('click', function () {
    const isOpen = !backgroundSettings.hidden;
    backgroundSettings.hidden = isOpen;
    if (isOpen) setIconButton(backgroundEditBtn, 'icon-shezhi', '背景设置');
    else {
      backgroundEditBtn.textContent = '×';
      backgroundEditBtn.setAttribute('aria-label', '收起背景设置');
      backgroundEditBtn.title = '收起背景设置';
    }
    backgroundEditBtn.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) backgroundUrlInput.focus();
  });

  backgroundBlurInput.addEventListener('input', updateBlurLabel);

  backgroundFileBtn.addEventListener('click', function () {
    backgroundFileInput.click();
  });

  backgroundFileInput.addEventListener('change', function () {
    const file = backgroundFileInput.files && backgroundFileInput.files[0];
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      backgroundFileStatus.textContent = '请选择图片文件。';
      backgroundFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', function () {
      background = {
        url: String(reader.result),
        blur: Number(backgroundBlurInput.value)
      };
      markBackgroundRefreshed(background.url);
      backgroundUrlInput.value = background.url;
      applyBackground();
      const saved = store.set(CONFIG.keys.background, background);
      backgroundFileStatus.textContent = saved
        ? '已加载“' + file.name + '”并保存为背景。'
        : '已加载“' + file.name + '”；图片过大时可能无法在刷新后保留。';
      backgroundFileInput.value = '';
    });
    reader.addEventListener('error', function () {
      backgroundFileStatus.textContent = '无法读取该图片，请尝试其他文件。';
      backgroundFileInput.value = '';
    });
    reader.readAsDataURL(file);
  });

  backgroundSaveBtn.addEventListener('click', function () {
    background = {
      url: backgroundUrlInput.value.trim(),
      blur: Number(backgroundBlurInput.value)
    };
    markBackgroundRefreshed(background.url);
    store.set(CONFIG.keys.background, background);
    applyBackground();
    backgroundFileStatus.textContent = '';
  });

  backgroundClearBtn.addEventListener('click', function () {
    background = { url: '', blur: 0 };
    markBackgroundRefreshed(background.url);
    store.set(CONFIG.keys.background, background);
    populateBackgroundForm();
    applyBackground();
    backgroundFileStatus.textContent = '';
  });

  populateBackgroundForm();
  applyBackground();

  /* =========================================================
   * 常用网站
   * =======================================================*/
  const siteGrid = document.getElementById('siteGrid');
  const sitesEditBtn = document.getElementById('sitesEditBtn');

  let sites = store.get(CONFIG.keys.sites, null);
  if (!Array.isArray(sites)) {
    sites = CONFIG.defaultSites.map(s => ({ name: s.name, url: s.url }));
  }

  let sitesEditing = false;

  function saveSites() { store.set(CONFIG.keys.sites, sites); }

  function firstChar(name) {
    const ch = (name || '').trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  function hueOf(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  // 大多数网站都在根目录提供 favicon.ico。使用 img 而不是 fetch 读取图标，
  // 可以避免跨域网站未开放 CORS 时无法显示图标的问题。
  function faviconUrlFor(siteUrl) {
    try {
      const url = new URL(siteUrl, window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return url.origin + '/favicon.ico';
    } catch (e) {
      return '';
    }
  }

  // 除浏览器自身的 HTTP 缓存外，在支持 Cache Storage 的安全上下文中再保存一份。
  // no-cors 响应不可读取，但可以原样缓存并由 service worker 在后续访问时返回。
  function cacheFavicon(url) {
    if (!url || !window.caches) return;
    caches.open(FAVICON_CACHE).then(function (cache) {
      return cache.match(url).then(function (cached) {
        if (cached) return null;
        return fetch(url, { mode: 'no-cors', credentials: 'omit' }).then(function (response) {
          return cache.put(url, response);
        });
      });
    }).catch(function () {
      // 缓存不可用时仍由浏览器的普通图片缓存处理，无需影响页面显示。
    });
  }

  function createSiteIcon(site) {
    const icon = document.createElement('span');
    icon.className = 'site-icon site-icon-fallback';
    const hue = hueOf(site.name);
    icon.style.background = 'hsl(' + hue + ', 70%, 92%)';
    icon.style.color = 'hsl(' + hue + ', 45%, 38%)';

    const fallback = document.createElement('span');
    fallback.className = 'site-icon-fallback';
    fallback.textContent = firstChar(site.name);
    icon.appendChild(fallback);

    const faviconUrl = site.icon || faviconUrlFor(site.url);
    if (!faviconUrl) return icon;

    const image = document.createElement('img');
    image.className = 'site-favicon';
    image.alt = '';
    image.width = 24;
    image.height = 24;
    // 图标默认不可见，不能使用 lazy；浏览器会跳过隐藏元素的懒加载请求。
    image.loading = 'eager';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('load', function () {
      icon.classList.remove('site-icon-fallback');
      icon.classList.add('has-favicon');
      cacheFavicon(image.currentSrc || image.src);
    });
    image.addEventListener('error', function () {
      image.remove();
    });
    // 必须在绑定事件后再赋值。刷新时图片可能直接命中内存缓存，
    // 若先赋值会错过 load 事件，导致图标继续被隐藏。
    image.src = faviconUrl;
    icon.appendChild(image);
    return icon;
  }

  function renderSites() {
    siteGrid.innerHTML = '';

    sites.forEach(function (site, index) {
      const card = document.createElement('a');
      card.className = 'site-card';
      card.href = site.url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.title = site.name + '\n' + site.url;

      // 编辑态下点击卡片不跳转
      if (sitesEditing) {
        card.addEventListener('click', function (e) {
          e.preventDefault();
          openModal(index);
        });
      }

      const icon = createSiteIcon(site);

      const name = document.createElement('span');
      name.className = 'site-name';
      name.textContent = site.name;

      card.appendChild(icon);
      card.appendChild(name);

      if (sitesEditing) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'site-del';
        del.textContent = '×';
        del.title = '删除';
        del.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          sites.splice(index, 1);
          saveSites();
          renderSites();
        });
        card.appendChild(del);
      }

      siteGrid.appendChild(card);
    });

    if (sitesEditing) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'site-card site-add';
      add.innerHTML =
        '<span class="site-icon">+</span><span class="site-name">新建</span>';
      add.addEventListener('click', openModal);
      siteGrid.appendChild(add);
    }
  }

  sitesEditBtn.addEventListener('click', function () {
    sitesEditing = !sitesEditing;
    setIconButton(sitesEditBtn, sitesEditing ? 'icon-wancheng' : 'icon-bianji', sitesEditing ? '完成编辑常用网站' : '编辑常用网站');
    sitesEditBtn.classList.toggle('active', sitesEditing);
    renderSites();
  });

  /* =========================================================
   * 添加快捷链接弹窗
   * =======================================================*/
  const mask = document.getElementById('modalMask');
  const modalTitle = document.getElementById('modalTitle');
  const nameInput = document.getElementById('siteName');
  const urlInput = document.getElementById('siteUrl');
  const iconUrlInput = document.getElementById('siteIconUrl');
  let editingSiteIndex = null;

  function openModal(index) {
    editingSiteIndex = Number.isInteger(index) ? index : null;
    const site = editingSiteIndex === null ? null : sites[editingSiteIndex];
    modalTitle.textContent = site ? '编辑快捷链接' : '添加快捷链接';
    nameInput.value = site ? site.name : '';
    urlInput.value = site ? site.url : '';
    iconUrlInput.value = site && site.icon ? site.icon : '';
    mask.hidden = false;
    nameInput.focus();
  }

  function closeModal() {
    mask.hidden = true;
    editingSiteIndex = null;
  }

  function saveNewSite() {
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    let icon = iconUrlInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    if (!url) { urlInput.focus(); return; }
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    if (icon && !/^https?:\/\//i.test(icon)) icon = 'https://' + icon;
    const site = { name: name, url: url };
    if (icon) site.icon = icon;
    if (editingSiteIndex === null) sites.push(site);
    else sites[editingSiteIndex] = site;
    saveSites();
    renderSites();
    closeModal();
  }

  document.getElementById('modalSave').addEventListener('click', saveNewSite);
  document.getElementById('modalCancel').addEventListener('click', closeModal);

  mask.addEventListener('click', function (e) {
    if (e.target === mask) closeModal();
  });

  [nameInput, urlInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveNewSite(); }
      else if (e.key === 'Escape') closeModal();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mask.hidden) closeModal();
  });

  /* =========================================================
   * 调试入口
   * =======================================================*/
  const debugList = document.getElementById('debugList');
  const debugEditBtn = document.getElementById('debugEditBtn');

  let debugRows = store.get(CONFIG.keys.debug, null);
  if (!Array.isArray(debugRows)) {
    debugRows = JSON.parse(JSON.stringify(CONFIG.defaultDebugRows));
  }

  let debugEditing = false;

  function saveDebug() { store.set(CONFIG.keys.debug, debugRows); }

  // 显示态：一个端口按钮
  function buildPortButton(row, p) {
    const proto = p.protocol || 'http';
    const port = p.port;
    const a = document.createElement('a');
    a.className = 'port-btn';
    a.href = proto + '://' + row.ip + ':' + port;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = a.href;

    const protoSpan = document.createElement('span');
    protoSpan.className = 'port-proto';
    protoSpan.classList.add(proto === 'https' ? 'protocol-https' : 'protocol-http');
    protoSpan.setAttribute('aria-label', proto.toUpperCase());
    protoSpan.title = proto.toUpperCase();
    const protoIcon = document.createElement('span');
    protoIcon.className = 'iconfont ' + (proto === 'https' ? 'icon-https' : 'icon-HTTP');
    protoIcon.setAttribute('aria-hidden', 'true');
    protoSpan.appendChild(protoIcon);
    a.appendChild(protoSpan);

    if (p.name) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'port-name';
      nameSpan.textContent = p.name;
      a.appendChild(nameSpan);
    }

    const numSpan = document.createElement('span');
    numSpan.className = 'port-num';
    numSpan.textContent = '(' + port + ')';
    a.appendChild(numSpan);

    return a;
  }

  // 编辑态：一个端口编辑器
  function buildPortEditor(row, p, portIndex) {
    const editor = document.createElement('div');
    editor.className = 'port-editor';

    const proto = document.createElement('select');
    proto.className = 'port-proto-select';
    ['http', 'https'].forEach(function (v) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if ((p.protocol || 'http') === v) opt.selected = true;
      proto.appendChild(opt);
    });
    proto.addEventListener('change', function () {
      p.protocol = proto.value;
      saveDebug();
    });
    editor.appendChild(proto);

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'port-name-input';
    name.value = p.name || '';
    name.placeholder = '名称';
    name.addEventListener('input', function () {
      p.name = name.value;
      saveDebug();
    });
    editor.appendChild(name);

    const port = document.createElement('input');
    port.type = 'number';
    port.className = 'port-num-input';
    port.value = p.port === '' || p.port == null ? '' : p.port;
    port.placeholder = '端口';
    port.addEventListener('input', function () {
      p.port = port.value === '' ? '' : Number(port.value);
      saveDebug();
    });
    editor.appendChild(port);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'port-del';
    del.textContent = '×';
    del.title = '删除此端口';
    del.addEventListener('click', function () {
      row.ports.splice(portIndex, 1);
      saveDebug();
      renderDebug();
    });
    editor.appendChild(del);

    return editor;
  }

  function renderDebug() {
    debugList.innerHTML = '';

    debugRows.forEach(function (row, rowIndex) {
      const line = document.createElement('div');
      line.className = 'debug-row';

      if (debugEditing) {
        // IP 输入框
        const ipInput = document.createElement('input');
        ipInput.type = 'text';
        ipInput.className = 'debug-ip-input';
        ipInput.value = row.ip || '';
        ipInput.placeholder = 'IP 地址';
        ipInput.addEventListener('input', function () {
          row.ip = ipInput.value;
          saveDebug();
        });
        line.appendChild(ipInput);

        // 端口编辑器
        row.ports.forEach(function (p, portIndex) {
          line.appendChild(buildPortEditor(row, p, portIndex));
        });

        // 添加端口
        const addPort = document.createElement('button');
        addPort.type = 'button';
        addPort.className = 'add-port-btn';
        addPort.textContent = '+ 端口';
        addPort.addEventListener('click', function () {
          row.ports.push({ name: '', port: '', protocol: 'http' });
          saveDebug();
          renderDebug();
        });
        line.appendChild(addPort);

        // 删除整行
        const delRow = document.createElement('button');
        delRow.type = 'button';
        delRow.className = 'del-row-btn';
        delRow.textContent = '删除行';
        delRow.title = '删除整行';
        delRow.addEventListener('click', function () {
          debugRows.splice(rowIndex, 1);
          saveDebug();
          renderDebug();
        });
        line.appendChild(delRow);
      } else {
        // 显示 IP
        const ip = document.createElement('span');
        ip.className = 'debug-ip';
        ip.textContent = row.ip || '(未设置 IP)';
        line.appendChild(ip);

        // 显示端口按钮（跳过端口为空的中间状态）
        row.ports.forEach(function (p) {
          if (p.port === '' || p.port == null) return;
          line.appendChild(buildPortButton(row, p));
        });
      }

      debugList.appendChild(line);
    });

    // 添加行按钮仅在编辑态出现
    if (debugEditing) {
      const addRow = document.createElement('button');
      addRow.type = 'button';
      addRow.className = 'add-row-btn';
      addRow.textContent = '+ 添加一行';
      addRow.addEventListener('click', function () {
        debugRows.push({ ip: '', ports: [] });
        saveDebug();
        renderDebug();
      });
      debugList.appendChild(addRow);
    }
  }

  debugEditBtn.addEventListener('click', function () {
    debugEditing = !debugEditing;
    setIconButton(debugEditBtn, debugEditing ? 'icon-wancheng' : 'icon-bianji', debugEditing ? '完成编辑调试入口' : '编辑调试入口');
    debugEditBtn.classList.toggle('active', debugEditing);
    renderDebug();
  });

  /* =========================================================
   * 初始化
   * =======================================================*/
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      // 首次注册时，首屏资源早于 Worker 激活。Worker 接管后重新渲染，
      // 让图标请求进入它的 fetch 处理器。
      renderSites();
    }).catch(function () {
      // file:// 或非安全上下文无法注册 service worker，不影响图标加载。
    });
  }

  renderSites();
  renderDebug();
})();
