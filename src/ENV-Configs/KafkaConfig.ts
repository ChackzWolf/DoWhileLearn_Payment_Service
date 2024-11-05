interface TransactionMessage {
  transactionId: string;
  status: string;
  // Add any other fields you expect in the message
}


import { Kafka, Producer, Consumer, KafkaMessage} from 'kafkajs';
import { configs } from './ENV.configs';

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
      clientId: configs.CLIENT_ID,
      brokers: [configs.BROKER_1],
  });
  }

  public static getInstance(): KafkaConfig {
    if (!KafkaConfig.instance) {
      KafkaConfig.instance = new KafkaConfig();
    }
    return KafkaConfig.instance;
  }

  

  async createTopic(topicName:string, noOfPartition: number) {
    try {

        const admin = this.kafka.admin();
        await admin.connect();
        await admin.createTopics({
            topics: [{
                topic: topicName,
                numPartitions: noOfPartition,
                replicationFactor: 1, 
            }],
        });
        await admin.disconnect();

        console.log("Topic successfully created.")
    } catch (error) {
        console.log('Failed to create topic.')
    }
}


  async sendMessage(topicName:string, message:any){
    const producer = this.kafka.producer();
    try {
        await producer.connect();
        console.log(message)
        await producer.send({
            topic: topicName,
            messages: [{ value: JSON.stringify(message) }],
        })
        console.log('message has send');
    } catch (error) {
        console.log('error, error, error', error)
    } finally{ 
        await producer.disconnect()
    } 
  }   
  
  async consumeMessages(topicName:string){
    const consumer = this.kafka.consumer({groupId:'test-group'});
    try {
        await consumer.connect();  
        await consumer.subscribe({ 
            topic:topicName, 
            fromBeginning:true,  
        })    

        await consumer.run({
            eachMessage: async ({
                topic,
                partition,
                message
            })=>{
                const value = `Recieved message: ${message.value?.toString()} from partition. & topic ${topic}`;
                console.log(value);
            }
    })
    } catch (error) {
        
    }
}/////


// async getProducer(): Promise<Producer> {
  //   if (!this.producer) {
  //     this.producer = this.kafka.producer();
  //     await this.producer.connect();
  //   }
  //   return this.producer;
  // }

  // async getConsumer(groupId: string): Promise<Consumer> {
  //   if (!this.consumers.has(groupId)) {
  //     const consumer = this.kafka.consumer({ groupId });
  //     await consumer.connect();
  //     this.consumers.set(groupId, consumer);
  //   }
  //   return this.consumers.get(groupId)!;
  // }

  ////


  // async consumeMessages(
  //     groupId: string,
  //     topics: string[],
  //     messageHandler: (message: KafkaMessage) => Promise<void>
  // ):  Promise<void>{
  //   // const { groupId, topics, messageHandler, maxRetries = 3, retryDelay = 1000 } = config;
  //   const maxRetries = 3
  //   const retryDelay = 1000
  //   try {
  //     const consumer = await this.getConsumer(groupId);
  //     await Promise.all(topics.map((topic) => consumer.subscribe({ topic })));

  //     await consumer.run({
  //       eachMessage: async ({ topic, partition, message }) => {
  //         console.log(`Received message from topic ${topic}:`, message.value?.toString());
  //         let retryCount = 0;
  //         let processed = false;

  //         while (!processed && retryCount < maxRetries) {
  //           try {
  //             await messageHandler(message);
  //             processed = true;
  //           } catch (error :any) {
  //             if (error.message === 'The group is rebalancing, so a rejoin is needed') {
  //               console.warn(`Retrying message from topic ${topic} due to rebalancing (attempt ${retryCount + 1}/${maxRetries})`);
  //               await new Promise((resolve) => setTimeout(resolve, retryCount * retryDelay));
  //               retryCount++;
  //             } else {
  //               console.error(`Error processing message from topic ${topic}:`, error);
  //               processed = true;
  //             }
  //           }
  //         }

  //         if (!processed) {
  //           console.error(`Failed to process message from topic ${topic} after ${maxRetries} retries`);
  //         }
  //       },
  //     });
  //   } catch (error) {
  //     console.error('Error consuming messages:', error);
  //     throw error;
  //   }
  // }
}

export const kafkaConfig = KafkaConfig.getInstance();   