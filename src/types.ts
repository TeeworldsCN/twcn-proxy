import { AxiosInstance } from 'axios';
import fastify from 'fastify';
import { RedisDBP } from '.';

export type Route = (app: ReturnType<typeof fastify>, axios: AxiosInstance, db: RedisDBP) => void;
