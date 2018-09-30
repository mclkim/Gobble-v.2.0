const amqp = require('amqplib/callback_api');

const { Puppet } = require('./fnguide.js');
const { RedisClient } = require('./cache.js');

amqp.connect('amqp://admin:admin123@rabbit:5672//', (err, conn) => {
  conn.createChannel((err, ch) => {
    const q = 'crawl';

    ch.assertQueue(q, { durable: true });
    console.log("[*] %s 큐에서 데이터 수집 태스크를 기다리고 있습니다. 프로그램 종료를 위해서는 CTRL+C 를 누르세요.", q);
    ch.consume(q, async (task) => {
      console.log("[x] 데이터 수집 요청 받음");
      const receivedTask = JSON.parse(task.content.toString());

      // Redis 캐시 연결하여 데이터 저장할 준비
      const redis = new RedisClient();
      await redis.auth();

      // 모든 태스크는 퍼페티어를 기반으로 한다
      // 태스크를 받았다면 우선 크롬을 실행시킨다
      const puppet = new Puppet('crawl');
      const started = await puppet.startBrowser(true, 100);
      if (started == true) {
        await puppet.login();
      }

      // 태스크 시작
      if (receivedTask === 'DATE') {
        const dateData = await puppet.massDateCrawl(); // API로 요청을 보내어 데이터를 가지고 옵니다.
        processor.setData(dateData);
        const processeDateData = processor.processMassDate();
        await redis.delKey('mass_date');
        await redis.setList(processeDateData);
        console.log('set dates data complete')
      }

      if (receivedTask === 'TICKER') {
        // pass
      }

    }, { noAck: false });
  });
});