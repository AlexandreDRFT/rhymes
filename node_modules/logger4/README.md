# logger4

### Install via npm
```
npm i logger4
```

### Example usage
```ts
// Logger.ts
import Logger4 from 'logger4';

export let Logger = new Logger4({
    path: path.join(process.cwd(), 'log'),
    directorySizeLimitMB: 3000
});

// script.ts
Logger.info('Hello World!');
```
