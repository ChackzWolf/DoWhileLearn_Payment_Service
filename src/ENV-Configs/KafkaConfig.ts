

// utils/kafka.ts
import { config } from 'dotenv';
import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';
import { configs } from './ENV.configs';
import { OrderEventData } from '../Services/Payment.service';

export class KafkaConfig {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private static instance: KafkaConfig;

  private constructor() { 
    this.kafka = new Kafka({
      clientId: configs.CLIENT_ID,
      brokers: [configs.BROKER_1],
      retry: {
        maxRetryTime: 60000, // 60 seconds

      },
      connectionTimeout: 10000, // 10 seconds
      requestTimeout: 25000, // 25 seconds
    });
  }

  public static getInstance(): KafkaConfig {
    if (!KafkaConfig.instance) {
      KafkaConfig.instance = new KafkaConfig();
    }
    return KafkaConfig.instance;
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
      });
      await this.producer.connect();
    }
    return this.producer;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  // async getConsumer(groupId: string): Promise<Consumer> {
  //   if (!this.consumer) {
  //     this.consumer = this.kafka.consumer({ groupId });
  //     await this.consumer.connect();
  //   }
  //   return this.consumer;
  // }

  // async sendMessage(
  //   topic: string,
  //   message: any,
  //   attempt: number = 1
  // ): Promise<void> {
  //   try {
  //     const producer = await this.getProducer();
      
  //     const kafkaMessage = {
  //       key: message.transactionId,
  //       value: JSON.stringify(message),
  //       headers: {
  //         'idempotency-key': message.transactionId,
  //         'attempt': attempt.toString(),
  //         'timestamp': Date.now().toString(),
  //       }
  //     };

  //     await producer.send({
  //       topic,
  //       messages: [kafkaMessage],
  //       acks: -1, // Wait for all replicas to acknowledge
  //     });

  //     console.log(`Message sent successfully to topic ${topic}:`, {
  //       transactionId: message.transactionId,
  //       attempt
  //     });
  //   } catch (error) {
  //     console.error(`Error sending message to ${topic}:`, error);

  //     if (attempt < 3) {
  //       console.log(`Retrying message send (attempt ${attempt + 1}/${3})`);
  //       await this.delay(3000 * attempt); // Exponential backoff
  //       return this.sendMessage(topic, message, attempt + 1);
  //     }

  //     throw new Error(
  //       `Failed to send message after ${3} attempts: ${error}`
  //     );
  //   }
  // }

  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      const producer = await this.getProducer();
      await producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }]
      });
      console.log(`Message sent to topic ${topic}:`, message);
    } catch (error) {
      console.error(`Error sending message to ${topic}:`, error);
      throw error;
    }
  }

  public async handlePaymentTransaction(event: OrderEventData) {
    try {
      // Send payment success message
      await this.sendMessage('payment.success', event);
      console.log('///////////////////Payment success event sent:', event); 
  
      // Wait for saga completion message
      const sagaResponse = await this.consumeMessages('payment.saga.completed', event.transactionId);
      console.log('Saga completion received:', sagaResponse);
  
      return sagaResponse;
    } catch (error) {
      console.error('Error in payment transaction:', error);
      throw error;
    }
  }

  
  private readonly DEFAULT_TIMEOUT = 35000; // 35 seconds timeout

  private async getConsumer(groupId: string): Promise<Consumer> {
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        readUncommitted: false  // Instead of autoOffsetReset
      });
      await this.consumer.connect();
    } 
    return this.consumer;
  }
  


  public async consumeMessages(topicName: string, transactionId: string): Promise<any> {
    const consumer = await this.getConsumer('payment-saga-participant-group');
    
    try {
      const message = await this.waitForMessage(consumer, topicName, transactionId);
      console.log('Final message received:', message);
      return message;
    } finally {
      // Ensure consumer is always stopped after message is received or timeout occurs
      await consumer.stop();
    }
  }

  private async waitForMessage(consumer: any, topicName: string, transactionId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let isResolved = false;

      const cleanup = async () => {
        clearTimeout(timeoutId);
        if (!isResolved) {
          try {
            console.log('stoping consumer');
            await consumer.stop();
          } catch (error) {
            console.error('Error stopping consumer:', error);
          }
        }
      };

      // Set up timeout
      timeoutId = setTimeout(async () => {
        await cleanup();
        reject(new Error(`Timeout waiting for message with transactionId: ${transactionId}`));
      }, this.DEFAULT_TIMEOUT);

      const messageHandler = async ({ topic, partition, message }: { topic: string; partition: number; message: any }) => {
        try {
          const value = JSON.parse(message.value?.toString() || '{}');
          console.log('Received message:', value);

          if (value.transactionId === transactionId) {
            console.log('Transaction ID matched:', transactionId);
            isResolved = true;
            await cleanup();
            resolve(value);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          await cleanup();
          reject(error);
        }
      };

      // Subscribe to topic
      consumer.subscribe({
        topic: topicName,
        fromBeginning: true
      });

      // Start consuming messages
      consumer.run({
        eachMessage: messageHandler
      }).catch(async (error: Error) => {
        console.error('Consumer run error:', error);
        await cleanup();
        reject(error);
      });
    });
  }
}

export const kafkaConfig = KafkaConfig.getInstance();