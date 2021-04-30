# LoaderJs



## 基本使用方法

```javascript
/**
 * 1. 串行执行
 * 先加载第一个任务，成功后第二个，再成功后第三个 …… 以此类推
 */
Loader.load('jquery', function fn(){ 
  console.log('fn')
})
// 先加载 jquery.js，成功后执行函数 fn

/**
 * 2. 并行执行
 * 所有任务同步加载
 */
Loader.load(['lazyload', 'lightbox'])
// 同步加载 lazyload.js 和 lightbox.js

/**
 * 3. 串行、并行混合
 */
Loader.load('jquery.js', ['lazyload', 'lightbox'], function fn1(){ 
  console.log('fn1')
}, function fn2(){ 
  console.log('fn2')
})
// 首先加载jquery.js，成功后同步加载 lazyload.js 和 lightbox.js，都成功后执行函数 fn1,
// fn1 执行成功后执行函数 fn2

/**
 * 4. 在 js 文件或函数中嵌套任务
 */
Loader.load('jquery', function fn1(){
  Loader.load(['lazyload', 'lightbox'])
  console.log('fn1')
}, function fn2(){
  console.log('fn2')
})
// 先加载 jquery.js，成功后执行函数 fn1;
// fn1 执行中，首先开始同步加载 lazyload.js 和 lightbox.js, 随后控制台打印 'fn1',
// lazyload.js 和 lightbox.js 加载成功后 fn1 执行完毕，开始执行函数 fn2

```



## 定义串行或并行任务

1. `Loader.load()` 的参数默认生成一个串行任务
2. `Loader.load()` 参数中的数组默认生成一个并行任务
3. 可使用 `Loader.series()` 手动生成一个串行任务
4. 可使用 `Loader.parallel()` 手动生成一个并行任务
5. 手动生成的串行或并行任务本身没有 `load()` 方法，无法独立加载，只能通过 `Loader.load()` 加载；另外，手动串/并行任务也可以作为 `Loader.series()/Loader.parallel()` 的参数，从而成为另一个手动串/并行任务的子任务



## 自定义加载器

