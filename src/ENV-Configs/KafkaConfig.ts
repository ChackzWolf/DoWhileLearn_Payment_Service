interface TransactionMessage {
  transactionId: string;
  status: string;
  // Add any other fields you expect in the message
}

// // utils/kafka.ts
// import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

// export class KafkaConfig {
//   private kafka: Kafka;
//   private producer: Producer | null = null;
//   private consumer: Consumer | null = null;
//   private static instance: KafkaConfig;

//   private constructor() {
//     this.kafka = new Kafka({
//       clientId: 'elearning-service',
//       brokers: ['localhost:9092']
//     });
//   }

//   public static getInstance(): KafkaConfig {
//     if (!KafkaConfig.instance) {
//       KafkaConfig.instance = new KafkaConfig();
//     }
//     return KafkaConfig.instance;
//   }
 
//   async getProducer(): Promise<Producer> {
//     if (!this.producer) {
//       this.producer = this.kafka.producer();
//       await this.producer.connect();
//     }
//     return this.producer;
//   }

//   async getConsumer(groupId: string): Promise<Consumer> {
//     if (!this.consumer) {
//       this.consumer = this.kafka.consumer({ groupId });
//       await this.consumer.connect();
//     }
//     return this.consumer;
//   }

//   async sendMessage(topic: string, message: any): Promise<void> {
//     try {
//       const producer = await this.getProducer();
//       await producer.send({
//         topic,
//         messages: [{ value: JSON.stringify(message) }]
//       });
//       console.log(`Message sent to topic ${topic}:`, message);
//     } catch (error) {
//       console.error(`Error sending message to ${topic}:`, error);
//       throw error;
//     }
//   }

//   async consumeMessages(
//     groupId: string,
//     topics: string[],
//     messageHandler: (message: KafkaMessage) => Promise<void>
//   ): Promise<void> {
//     try {
//       const consumer = await this.getConsumer(groupId);
//       await Promise.all(topics.map(topic => consumer.subscribe({ topic })));

//       await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//           console.log(`Received message from topic ${topic}:`, message.value?.toString());
//           await messageHandler(message);
//         }
//       });
//     } catch (error) {
//       console.error('Error consuming messages:', error);
//       throw error;
//     }
//   }
// }

// export const kafkaConfig = KafkaConfig.getInstance();

// utils/kafka.ts
// utils/kafka.ts
// utils/kafka.ts
import { Kafka, Producer, Consumer, KafkaMessage} from 'kafkajs';

interface KafkaConsumerConfig {
  groupId: string;
  topics: string[];
  messageHandler: (message: KafkaMessage) => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
} 

export class KafkaConfig {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private static instance: KafkaConfig;

  private constructor() {
    this.kafka = new Kafka({
      clientId: 'elearning-service',
      brokers: ['localhost:9092'],
    });
  }

  public static getInstance(): KafkaConfig {
    if (!KafkaConfig.instance) {
      KafkaConfig.instance = new KafkaConfig();
    }
    return KafkaConfig.instance;
  }

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  async getConsumer(groupId: string): Promise<Consumer> {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      this.consumers.set(groupId, consumer);
    }
    return this.consumers.get(groupId)!;
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      const producer = await this.getProducer();
      await producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      console.log(`Message sent to topic ${topic}:`, message);
    } catch (error) {
      console.error(`Error sending message to ${topic}:`, error);
      throw error;
    }
  }
 
   

  // async consumeMessages( 
  //   groupId: string,
  //   topics: string[], 
  //   messageHandler: (message : KafkaMessage) => Promise<void>
  // ): Promise<void> {
  //   try {
  //     const consumer = await this.getConsumer(groupId);
  //     await Promise.all(topics.map(topic => consumer.subscribe({ topic })));

  //     await consumer.run({
  //       eachMessage: async ({ topic, partition, message }) => {
  //         console.log(`Received message from topic ${topic}:`, message.value?.toString());
  //         await messageHandler(message);
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error consuming messages:', error);
  //     throw error;
  //   }
  // }

  async consumeMessages(
      groupId: string,
      topics: string[],
      messageHandler: (message: KafkaMessage) => Promise<void>
  ):  Promise<void>{
    // const { groupId, topics, messageHandler, maxRetries = 3, retryDelay = 1000 } = config;
    const maxRetries = 3
    const retryDelay = 1000
    try {
      const consumer = await this.getConsumer(groupId);
      await Promise.all(topics.map((topic) => consumer.subscribe({ topic })));

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`Received message from topic ${topic}:`, message.value?.toString());
          let retryCount = 0;
          let processed = false;

          while (!processed && retryCount < maxRetries) {
            try {
              await messageHandler(message);
              processed = true;
            } catch (error :any) {
              if (error.message === 'The group is rebalancing, so a rejoin is needed') {
                console.warn(`Retrying message from topic ${topic} due to rebalancing (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, retryCount * retryDelay));
                retryCount++;
              } else {
                console.error(`Error processing message from topic ${topic}:`, error);
                processed = true;
              }
            }
          }

          if (!processed) {
            console.error(`Failed to process message from topic ${topic} after ${maxRetries} retries`);
          }
        },
      });
    } catch (error) {
      console.error('Error consuming messages:', error);
      throw error;
    }
  }
}

export const kafkaConfig = KafkaConfig.getInstance();   