import { Request } from "express";
import { ParamsDictionary, Query } from "express-serve-static-core";
import { Authenticator, User } from "./entity";

export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ReqBody = any,
  ReqQuery = Query,
> extends Request<P, any, ReqBody, ReqQuery> {
  user?: User;
  credential?: Authenticator;
}

// convenience interfaces for common use cases

// WithTypedParams
export interface RequestWithTypedParams<P> extends Request<P> {}
export interface AuthenticatedRequestWithTypedParams<P>
  extends AuthenticatedRequest<P> {}

// WithTypedBody
export interface RequestWithTypedBody<ReqBody>
  extends Request<ParamsDictionary, ReqBody> {}
export interface AuthenticatedRequestWithTypedBody<ReqBody>
  extends AuthenticatedRequest<ParamsDictionary, ReqBody> {}

// WithTypedQuery
export interface RequestWithTypedQuery<ReqQuery>
  extends Request<ParamsDictionary, any, ReqQuery> {}
export interface AuthenticatedRequestWithTypedQuery<ReqQuery>
  extends AuthenticatedRequest<ParamsDictionary, any, ReqQuery> {}
