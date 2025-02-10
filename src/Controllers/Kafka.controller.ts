import debug from 'debug';
import { Kafka } from 'kafkajs';
import { configs } from '../ENV-Configs/ENV.configs';
import dotenv from 'dotenv';

dotenv.config();

const logger = debug('node-kafka:KafkaController');

class KafkaController {
    private kafka: Kafka;

    constructor() { 
        this.kafka = new Kafka({
            clientId: configs.CLIENT_ID,
            brokers: [configs.BROKER_1],
        });
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
            logger(error);
            console.log('Failed to create topic.')
        }
    }

    async publishMessageToTopic(topicName:string, messages:any){
        const producer = this.kafka.producer();
        try {
            await producer.connect();
            await producer.send({
                topic: topicName,
                messages,
            })
            console.log('message has send');
        } catch (error) {
            console.log('error, error, error', error)
        } finally{
            await producer.disconnect()
        }
    }

    async consumerMessageFromTopic(topicName:string){
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
    }
}

export default KafkaController;
