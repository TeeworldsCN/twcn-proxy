import { AxiosInstance } from 'axios';
import fastify from 'fastify';

export type Route = (app: ReturnType<typeof fastify>, axios: AxiosInstance) => void;
