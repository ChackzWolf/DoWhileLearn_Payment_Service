

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

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  // async getConsumer(groupId: string): Promise<Consumer> {
  //   if (!this.consumer) {
  //     this.consumer = this.kafka.consumer({ groupId });
  //     await this.consumer.connect();
  //   }
  //   return this.consumer;
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
      console.log('Payment success event sent:', event);
  
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
        heartbeatInterval: 3000
      });
      await this.consumer.connect();
    }
    return this.consumer;
  }
  
  public async consumeMessages(topicName: string, transactionId: string): Promise<any> {
    const consumer = await this.getConsumer('payment-saga-participant-group');
  
    const message = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for message with transactionId: ${transactionId}`));
      }, this.DEFAULT_TIMEOUT);
  
      let messageReceived = false;
  
      const messageHandler = async ({ topic, partition, message }: { topic: string; partition: number; message: any }) => {
        try {
          const value = JSON.parse(message.value?.toString() || '{}');
          console.log('Received message:', value);
  
          if (value.transactionId === transactionId) {
            console.log('transaction matched');
            messageReceived = true;
            clearTimeout(timeout);
            console.log('sending to resove', value)
            resolve(value);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          clearTimeout(timeout);
          reject(error);
        }
      };
  
      consumer.subscribe({
        topic: topicName,
        fromBeginning: true
      });
  
      consumer.run({
        eachMessage: messageHandler
      }).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  
      // Reject the promise if no message is received after the timeout
      setTimeout(async() => {
        if (!messageReceived) {
          await consumer.stop();
          reject(new Error(`Timeout waiting for message with transactionId: ${transactionId}`));
        }
      }, this.DEFAULT_TIMEOUT);
    }
    
    );
    console.log('message',message)
    return message
  }
}

export const kafkaConfig = KafkaConfig.getInstance();