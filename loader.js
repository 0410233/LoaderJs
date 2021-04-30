/**
 * Series and Parallel Task's Loader
 */
(function(global, undefined) {

  let
    doc = document,
    op = Object.prototype,
    ostring = op.toString;

  function is(type) {
    return function(it) {
      return ostring.call(it) === '[object '+type+']';
    }
  }

  // 类型检测
  let
    isObject = is('Object'),
    isString = is('String'),
    isFunction = is('Function'),
    isArray = is('Array');

  // 数组降维
  function flatten(arr) {
    return arr.reduce(function(acc, val) {
      return acc.concat(isArray(val) ? flatten(val) : val);
    }, []);
  }

  function argumentsToArray(args) {
    return Array.prototype.slice.call(args)
  }

  function getRealUrl(url) {
    const a = document.createElement('a');
    a.href = url;
    return a.href;
  }

  /**
   * 特性检测
   */
  const _detectors = {};

  function support(feature, env) {
    if (isFunction(_detectors[feature])) {
      _detectors[feature] = _detectors[feature](env || window)
    }
    return !!_detectors[feature];
  }

  function addFeatureDetector(feature, detector) {
    if (isString(feature) && detector != null) {
      _detectors[feature] = detector
    }
  }

  addFeatureDetector('HTMLPictureElement', function(env) {
    return 'HTMLPictureElement' in env
  })

  addFeatureDetector('IntersectionObserver', function(env) {
    // Exit early if all IntersectionObserver and IntersectionObserverEntry
    // features are natively supported.
    if ('IntersectionObserver' in env &&
        'IntersectionObserverEntry' in env &&
        'intersectionRatio' in env.IntersectionObserverEntry.prototype) {

      // Minimal polyfill for Edge 15's lack of `isIntersecting`
      // See: https://github.com/w3c/IntersectionObserver/issues/211
      if (!('isIntersecting' in env.IntersectionObserverEntry.prototype)) {
        Object.defineProperty(env.IntersectionObserverEntry.prototype,
          'isIntersecting', {
          get: function () {
            return this.intersectionRatio > 0;
          }
        });
      }
      return true;
    }
    return false
  })

  // 判断一个 script 是否 currentScript
  const isCurrentScript = (function(doc) {
    // 支持 document.currentScript
    if ("currentScript" in doc) {
      return function(script) {
        return script === doc.currentScript;
      }
    }

    // IE10
    if ("readyState" in doc.createElement("script") &&
        (!window.opera || window.opera.toString() !== "[object Opera]")) {
      return function(script) {
        return script.readyState === "interactive"
      }
    }

    // IE11 及其他
    return function(script) {
      try {
        throw new Error('');
      } catch (e) {
        return e.stack && script.src && e.stack.indexOf(script.src)
      }
    }
  })(doc);

  // 从给定的一组 script 中找出 currentScript
  function findCurrentScript(scripts) {
    for (let i = scripts.length-1; i >= 0; i--) {
      if (isCurrentScript(scripts[i])) return scripts[i];
    }
    return null;
  }

  // 建议引入 loader.js 时添加 id: `jsloader`
  const _currentScript = doc.getElementById('jsloader') || findCurrentScript(doc.scripts);

  function getCurrentWorkDir(currentScript) {
    // 截取完整路径中的目录部分
    // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
    // ref: http://jsperf.com/regex-vs-split/15
    const DIRNAME_RE = /[^?#]*\//;
    function dirname(path) {
      return path.match(DIRNAME_RE)[0];
    }

    // 尝试获取 js 文件所在目录
    if (currentScript && currentScript.src) {
      return dirname(currentScript.src)
    }

    // 忽略 about:xxx 和 blob:xxx
    const IGNORE_LOCATION_RE = /^(about|blob):/;

    // 如果是内嵌使用本 js，则 cwd 为页面所在目录
    return (!location.href || IGNORE_LOCATION_RE.test(location.href)) ? '' : dirname(location.href);
  }

  // 当前工作目录
  const _currentWorkDir = getCurrentWorkDir(_currentScript);

  // 补全文件路径
  const toUrl = (function() {
    // 路径解析
    const DOT_RE = /\/\.\//g;
    const DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
    const MULTI_SLASH_RE = /([^:/])\/+\//g;

    // Canonicalize a path
    // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
    function realpath(path) {
      // /a/b/./c/./d ==> /a/b/c/d
      path = path.replace(DOT_RE, "/");

      /*
        @author wh1100717
        a//b/c ==> a/b/c
        a///b/////c ==> a/b/c
        DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
      */
      path = path.replace(MULTI_SLASH_RE, "$1/");

      // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
      while (path.match(DOUBLE_DOT_RE)) {
        path = path.replace(DOUBLE_DOT_RE, "/");
      }

      return path;
    }

    const ABSOLUTE_RE = /^\/\/.|:\//;
    const ROOT_DIR_RE = /^.*?\/\/.*?\//;

    function addBase(specifier, cwd, base) {

      const first = specifier.charCodeAt(0);
      let path;

      if (first === 94 /* "^" */) {
        path = cwd + specifier.substring(1);
      }

      // Absolute or Root
      else if (ABSOLUTE_RE.test(specifier) || first === 47 /* "/" */) {
        path = specifier;
      }

      // Relative Or Top-level
      else {
        path = base + specifier;
      }

      // Add default protocol when url begins with "//"
      if (path.indexOf("//") === 0) {
        path = location.protocol + path;
      }

      return path;
    }

    return function toUrl(specifier, cwd, base) {
      if (!specifier) return "";

      cwd = isString(cwd) ? cwd.trim() : '';
      if (cwd && cwd.substr(-1) !== '/') {
        cwd += '/'
      }

      if (!isString(base)) {
        base = cwd
      } else {
        const first = base.charCodeAt(0);
        if (first !== '/' /* "/" */) {
          base = cwd + base.replace(/^[\^\s\/]*/, '')
        }
        base = base.trim()
      }
      if (base && base.substr(-1) !== '/') {
        base += '/'
      }

      specifier = addBase(specifier, cwd, base);

      return realpath(specifier);
    }
  })();

  const _config = {
    min: !!(_currentScript && /\.min.js\b/i.test(_currentScript.src)),
    base: './',
    paths: {},
  };

  // 任务 id
  let _taskid = 1;

  const _tasks = {
    _cache: {},
    _map: {},
    get: function(key, type) {
      if (!isString(key) || !key) {
        return null
      }
      return this._cache[this._map[type] && this._map[type][key] || key]
    },
    put: function(key, task) {
      this._cache[task.uid] = task
      if (isString(key) && key) {
        const type = task.type
        if (!this._map[type]) {
          this._map[type] = {}
        }
        this._map[type][key] = task.uid
      }
      return task
    },
    getById: function(id) {
      return this._cache[id]
    },
  };

  const _loaders = {
    _items: {
      'series': {
        name: 'series',
        load: function(task) {
          task.emit('loading')
          task.emit('load')
        },
      },

      'parallel': {
        name: 'parallel',
        load: function(task) {
          task.emit('loading')
          task.emit('load')
        },
      },

      'function': {
        name: 'function',
        resolve: function(specifier, toUrl) {
          if (isFunction(specifier)) {
            return specifier
          }
          return false
        },
        load: function(task) {
          task.emit('loading');
          try {
            task.src.call(global, global);
            task.emit('load');
          } catch (e) {
            task.emit('error');
            console.error(e);
          }
        },
      },
    },
    _queue: [],
    each: function(cb) {
      const queue = this._queue.slice();
      queue.push('function')

      for (let i = queue.length - 1; i >= 0; i--) {
        if (cb(this._items[queue[i]])) {
          return
        }
      }
    },
    add: function(loader) {
      if (isFunction(loader)) {
        loader = loader()
      }

      // 检测加载器有效性
      const name = loader && isString(loader.name) && loader.name.trim() || null;
      if (name && !this._items[name] &&
          isFunction(loader.resolve) &&
          isFunction(loader.load))
      {
        this._items[name] = {
          name: name,
          resolve: loader.resolve,
          load: loader.load,
        }
        this._queue.push(name)
      }
    },
    get: function(name) {
      return this._items[name]
    },
    list: function() {
      console.log(this._queue.slice())
    },
  };

  // 任务状态
  const _status = {
    // 休眠
    // 此状态下允许添加依赖和子任务
    SLEEPING: 0,

    // 待机，等待依赖完成
    // 此状态下允许添加子任务
    // 如果依赖加载失败，会导致任务始终停留在此状态，无法继续
    WAITING: 1,

    // 就绪
    // 依赖已完成，等待执行加载
    READY: 2,

    // 加载中
    // 进入此状态时，之前添加的子任务会立即启动
    // 此状态下允许添加子任务，新添加的子任务会立即启动
    LOADING: 3,

    // 已加载
    // 任务本体已加载，等待子任务完成
    LOADED: 4,

    // 已完成
    SUCCEEDED: 5,

    // 失败
    // 任务加载过程中出现错误，或子任务错误，都会导致任务失败
    FAILED: 400,
  };

  /**
   * Task 对象构造函数
   */
  function Task(src, type) {

    if (!(this instanceof Task)) {
      return findOrCreate(src)
    }

    this.uid = _taskid++;

    this.src = src;
    this.type = type;

    this.name = '[' + (isFunction(src) ? src.name : src) + '|' + type + '|' + this.uid + ']';

    // 任务状态
    this.state = _status.SLEEPING;

    this.events = {};

    // 任务依赖
    this.dependence = 0;

    // 分支任务
    this.branches = [];

    // 存入缓存
    _tasks.put(null, this)
  }

  Task.prototype = {
    constructor: Task,

    // 添加事件回调
    on: function(event, callback) {
      if (this.events[event] == null) this.events[event] = [];
      this.events[event].push([callback, 0]);
      return this
    },

    // 添加一次性事件回调
    one: function(event, callback) {
      if (this.events[event] == null) this.events[event] = [];
      this.events[event].push([callback, 1]);
      return this
    },

    // 触发事件
    emit: function(event) {
      console.log(`${this.name} ${event}`)

      if (this.events[event]) {
        // 执行回调，
        let items = this.events[event];
        this.events[event] = [];
        for(let i = 0; i < items.length; i++) {
          const item = items[i];
          item[0].call(this);
          // 保留非一次性回调
          if (!item[1]) {
            this.events[event].push(item)
          }
        }
      }
      return this
    },

    // 添加依赖
    addDependence: function(task) {
      if (this.is('sleeping')) {
        // console.log(this.name + ' require ' + task.name)
        this.dependence++;
        const _self = this;
        task.onSuccess(function() {
          _self.removeDependence(this)
        });
      }
      return this;
    },

    // 移除依赖
    removeDependence: function(task) {
      // console.log(this.name + ' removeDependence ' + task.name)
      this.dependence--
      this.checkfor('ready')
      return this
    },

    // 添加分支任务
    addBranch: function(task) {
      if (this.state > _status.LOADING) {
        return this;
      }

      this.branches.push(task);
      const _host = this;
      task.onSuccess(function() {
        _host.removeBranch(this)
      }).onError(function() {
        _host.terminate()
      });

      // 分支任务在主任务开始加载时启动
      if (this.is('loading')) {
        task.start()
      }

      return this;
    },

    // 移除分支
    removeBranch: function(task) {
      const index = this.branches.indexOf(task)
      if (index >= 0) {
        this.branches.splice(index, 1)
        this.checkfor('success')
      }
      return this
    },

    // 任务状态转移
    checkfor: function(state) {
      switch (state) {
        // 任务转为待机状态（即：等待依赖完成）
        case 'waiting':
          if (this.is('sleeping')) {
            this.state = _status.WAITING
            this.checkfor('ready')
          }
          break;

        // 如果符合条件，则执行加载流程
        case 'ready':
          if (this.is('waiting') && this.dependence <= 0) {
            this.state = _status.READY
            // console.log(`${this.name} ready`)
            this.exec()
          }
          break;

        // 任务加载中
        case 'loading':
          if (this.is('ready')) {
            this.state = _status.LOADING
            this.branches.slice().forEach(function(task) {
              task.start()
            })
          }
          break;

        // 任务本体加载完毕
        case 'load':
          if (this.is('loading')) {
            this.state = _status.LOADED
            this.checkfor('success')
          }
          break;

        // 结束任务（检查任务是否成功）
        case 'success':
          if (this.is('loaded') && !this.branches.length) {
            this.state = _status.SUCCEEDED
            this.emit('success');
          }
          break;

        // 终止任务
        case 'error':
          if (!this.is('failed')) {
            this.state = _status.FAILED
            this.emit('error')
          }
          break;
      }
      return this
    },

    // 启动任务
    start: function() {
      this.checkfor('waiting')
      return this
    },

    // 终止任务
    terminate: function() {
      this.checkfor('error')
      return this
    },

    agent: function() {
      const task = this;
      return {
        src: task.src,
        bind: function(node) {
          if (node instanceof HTMLElement) {
            task.node = node;
          }
        },
        emit: function(event) {
          // event: loading / load / error
          task.checkfor(event)
        },
      }
    },

    // 执行加载流程
    exec: function() {
      const loader = _loaders.get(this.type)
      if (!loader) {
        throw new Error('找不到 ['+this.type+'] 类型的 loader')
      }

      loader.load(this.agent())
      return this
    },

    onSuccess: function(cb) {
      if (this.is('succeeded')) {
        cb.call(this)
      } else if (!this.is('error')) {
        this.one('success', cb)
      }
      return this
    },

    onError: function(cb) {
      if (!this.is('failed')) {
        this.one('error', cb)
      }
      return this
    },

    is: function(state) {
      return this.state === _status[state.trim().toUpperCase()]
    },
  };

  /**
   * 判断是否 Task 对象
   * @param {*} task
   * @return {Boolean}
   */
  function isTask(task) {
    return task && (task instanceof Task)
  }

  /**
   * 获取 Task 对象
   * @param {*} specifier
   * @return {Task}
   */
  function findOrCreate(specifier) {
    if (isTask(specifier)) {
      return specifier;
    }

    if (specifier instanceof Parallel || specifier instanceof Series) {
      return _tasks.getById(specifier.uid)
    }

    if (isArray(specifier)) {
      const _parallel = new Parallel(specifier)
      return _tasks.getById(_parallel.uid)
    }

    let task = null;
    _loaders.each(function(loader) {
      let cachekey = null;
      const src = loader.resolve(specifier, function(src) {
        const url = toUrl(src, _currentWorkDir, _config.base);
        cachekey = getRealUrl(url)
        return url
      });

      if (src) {
        cachekey = cachekey || src;
        task = _tasks.get(cachekey, loader.name)
        if (! task) {
          task = _tasks.put(cachekey, new Task(src, loader.name))
        }
        return true
      }
    })

    return task;
  }

  /**
   * 生成一个并行任务对象
   * @param {array} args
   */
  function Parallel(args) {
    const _parallel = new Task(null, 'parallel');
    flatten(args).forEach(function(specifier) {
      _parallel.addBranch(findOrCreate(specifier))
    });

    this.uid = _parallel.uid
  }

  /**
   * 生成一个串行任务对象
   * @param {Array} args
   */
  function Series(args) {
    const _series = new Task(null, 'series');
    args.reduce(function(prev, specifier) {
      const task = findOrCreate(specifier);
      if (prev) {
        task.addDependence(prev)
      }
      _series.addBranch(task)
      return task
    }, null)

    this.uid = _series.uid
  }

  /**
   * 查找宿主任务
   */
  function findHostTask() {
    let task = null, loadingScriptTasks = [];
    for (let i = _taskid - 1; i > 0; i--) {
      task = _tasks.getById(i)
      if (task && task.is('loading')) {
        if (task.type === 'function') {
          return task
        } else if (task.type === 'js' && (task.node instanceof HTMLScriptElement)) {
          loadingScriptTasks.push(task)
        }
      }
    }

    for (let i = 0; i < loadingScriptTasks.length; i++) {
      if (isCurrentScript(loadingScriptTasks[i].node)) {
        return loadingScriptTasks[i]
      }
    }

    return null
  }

  // 全局加载器
  let __Loader = global.Loader;
  let Loader = {
    series: function () {
      return new Series(argumentsToArray(arguments))
    },

    parallel: function () {
      return new Parallel(argumentsToArray(arguments))
    },

    load: function() {
      const _series = new Series(argumentsToArray(arguments));
      const task = _tasks.getById(_series.uid)

      const host = findHostTask();
      if (host) {
        host.addBranch(task)
      } else {
        task.start();
      }

      return this
    },

    extend: function(loader) {
      _loaders.add(loader)
      return this
    },

    list: function() {
      _loaders.list()
      return this
    },

    config: function(key, val) {
      if (key == null) {
        return _config
      }

      if (isString(key)) {
        if (val != null) {
          _config[key] = val;
          return _config
        }
        return _config[key]
      }

      if (isObject(key)) {
        for (const i in key) {
          if (key.hasOwnProperty(i)) {
            _config[i] = key[i];
          }
        }
      }

      return _config
    },

    noConflict: function() {
      global.Loader = __Loader;
      return this;
    },
  };

  // 添加 js 加载器
  Loader.extend({
    name: 'js',

    resolve: function(specifier, toUrl) {
      if (!isString(specifier)) {
        return false;
      }

      const query = '', pos = specifier.indexOf('?');
      if (pos >= 0) {
        query = specifier.substr(pos)
        specifier = specifier.substr(0, pos)
      }

      specifier = specifier.trim().replace(/^js:\s*/i, '');
      if (!(/\.js$/i.test(specifier))) {
        specifier += Loader.config('min') ? '.min.js' : '.js'
      }

      return toUrl(specifier + query);
    },

    load: function(task) {
      // Load script
      const node = document.createElement('script');

      node.charset = 'utf-8';
      node.async = true;
      node.src = task.src;

      node.onload = function() {
        node.onload = node.onerror = null
        task.emit('load')
      };

      node.onerror = function() {
        node.onload = node.onerror = null
        task.emit('error')
      };

      task.bind(node)

      // 开始加载 <script>
      document.head.appendChild(node)
      task.emit('loading')
    },
  })

  // 添加 polyfill 加载器
  Loader.extend({
    name: 'polyfill',

    resolve: function(specifier, toUrl) {
      if (isString(specifier) && /^polyfill:\s*/i.test(specifier.trim())) {
        return specifier.trim().replace(/^polyfill:\s*/i, '')
      }
      return false;
    },

    load: function(task) {
      if (support(task.src)) {
        task.emit('loading')
        task.emit('load')
        return
      }

      let node = document.createElement('script');

      node.charset = 'utf-8';
      node.async = true;
      node.src = 'https://polyfill.io/v3/polyfill.min.js?features=' + task.src;

      node.onload = function() {
        node.onload = node.onerror = null;
        task.emit('load')
      };

      node.onerror = function() {
        node.onload = node.onerror = null;
        task.emit('error')
      };

      task.bind(node)

      // 开始加载 <script>
      document.head.appendChild(node);
      task.emit('loading')
    },
  });

  // 添加 css 加载器
  Loader.extend({
    name: 'css',

    resolve: function(specifier, toUrl) {
      if (isString(specifier) && /^css:\s*|\.css(?=$|\?)/i.test(specifier.trim())) {
        specifier = specifier.trim().replace(/^css:\s*/i, '');
        if (!(/\.css(?=$|\?)/i.test(specifier))) {
          specifier += '.css'
        }
        return toUrl(specifier);
      }
      return false;
    },

    load: function(task) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'
      link.type = 'text/css'
      link.href = task.src
      document.head.appendChild(link)

      task.emit('loading')
      task.emit('load')
    },
  });

  global.Loader = Loader;

})(window || this);
