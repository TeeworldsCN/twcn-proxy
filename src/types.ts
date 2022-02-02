import { AxiosInstance } from 'axios';
import { RedisDefaultStore } from 'axios-cache-adapter';
import fastify from 'fastify';
import { RedisDBP } from '.';

export type RouteSetup = (
  app: ReturnType<typeof fastify>,
  store: RedisDefaultStore,
  db: RedisDBP
) => void;

export type Route = (app: ReturnType<typeof fastify>, store: AxiosInstance, db: RedisDBP) => void;
