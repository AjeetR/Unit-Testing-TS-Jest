import { Request } from "express";
import { ParamsDictionary, Query } from "express-serve-static-core";

export interface TypedRequest<T, U extends Query, V extends ParamsDictionary> extends Request {
  body: T;
  query: U;
  params: V;
}

export interface TypedRequestBody<T> extends Request {
  body: T;
}

export interface TypedRequestPath<V extends ParamsDictionary> extends Request {
  params: V;
}

export interface TypedRequestQuery<U extends Query> extends Request {
  query: U;
}
