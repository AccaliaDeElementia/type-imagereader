import type { Knex } from 'knex'
import type { Debugger } from 'debug'
import type { Application, Request, Response, Router } from 'express'
import type { Server } from 'http'
import type { Server as WebSocketServer, Socket as WebSocket } from 'socket.io'

export function Cast<T>(obj: unknown, isT: (o: unknown) => o is T): T {
  if (isT(obj)) return obj
  throw new Error('Object is not correct type to cast')
}

export function MakeCastFn<T>(isT: (obj: unknown) => obj is T): (obj: unknown) => T {
  return (obj) => {
    if (isT(obj)) return obj
    throw new Error('Input object not correct type')
  }
}

//eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Allow Knex Tests
export function IsKnex(_: unknown): _ is Knex<{}, unknown> {
  return true
}

//eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Allow Knex Tests
export function StubToKnex(stub: unknown): Knex<{}, unknown> {
  if (IsKnex(stub)) return stub
  throw new Error('Stub is not KNEX')
}

function StubIsDebugger(_: unknown): _ is Debugger {
  return true
}

export function StubToDebugger(stub: unknown): Debugger {
  if (StubIsDebugger(stub)) return stub
  throw new Error('Stub is not Debugger')
}

function StubIsResponse(_: unknown): _ is Response {
  return true
}

export function StubToResponse(stub: unknown): Response {
  if (StubIsResponse(stub)) return stub
  throw new Error('Stub is not Response')
}

function StubIsRequest(_: unknown): _ is Request {
  return true
}

export function StubToRequest(stub: unknown): Request {
  if (StubIsRequest(stub)) return stub
  throw new Error('Stub is not Request')
}

function StubIsRouter(_: unknown): _ is Router {
  return true
}

export function StubToRouter(stub: unknown): Router {
  if (StubIsRouter(stub)) return stub
  throw new Error('Stub is not Request')
}

type RequestHandler = (req: Request, res: Response) => Promise<void>

function StubIsRequestHandler(_: unknown): _ is RequestHandler {
  return true
}

export function StubToRequestHandler(stub: unknown): RequestHandler {
  if (StubIsRequestHandler(stub)) return stub
  throw new Error('Stub is not Request')
}

function StubIsApplication(_: unknown): _ is Application {
  return true
}

export function StubToApplication(stub: unknown): Application {
  if (StubIsApplication(stub)) return stub
  throw new Error('Stub is not Application')
}

function StubIsServer(_: unknown): _ is Server {
  return true
}

export function StubToServer(stub: unknown): Server {
  if (StubIsServer(stub)) return stub
  throw new Error('Stub is not Server')
}

function StubIsWebSocketServer(_: unknown): _ is WebSocketServer {
  return true
}

export function StubToWebSocketServer(stub: unknown): WebSocketServer {
  if (StubIsWebSocketServer(stub)) return stub
  throw new Error('Stub is not WebSocketServer')
}

function StubIsWebSocket(_: unknown): _ is WebSocket {
  return true
}

export function StubToWebSocket(stub: unknown): WebSocket {
  if (StubIsWebSocket(stub)) return stub
  throw new Error('Stub is not WebSocketServer')
}

export function IsVoidFunction(fn: unknown): fn is () => void {
  return typeof fn === 'function'
}

export function AssertVoidFn(fn: unknown): () => void {
  if (IsVoidFunction(fn)) return fn
  throw new Error('fn is nto a Void Function')
}

export function AssertThisFn(fn: unknown): (this: unknown) => void {
  if (IsVoidFunction(fn)) return fn
  throw new Error('fn is nto a Void Function')
}

export function IsPromiseVoidFunction(fn: unknown): fn is () => Promise<void> {
  return typeof fn === 'function'
}

export function AssertPromiseVoidFn(fn: unknown): () => Promise<void> {
  if (IsPromiseVoidFunction(fn)) return fn
  throw new Error('fn is nto a Void Function')
}

//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
function IsType<T>(_: unknown): _ is T {
  return true
}
//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
export function ForceCastTo<T>(obj: unknown): T {
  if (IsType<T>(obj)) return obj
  throw new Error('fn is not a Type<T>')
}

//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
export function IsFn<T>(fn: unknown): fn is (arg: T) => void {
  return typeof fn === 'function'
}
//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
export function AssertFn<T>(fn: unknown): (arg: T) => void {
  if (IsFn<T>(fn)) return fn
  throw new Error('fn is not a Fn<T>')
}

//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
export function IsPromiseFn<T>(fn: unknown): fn is (arg: T) => Promise<void> {
  return typeof fn === 'function'
}
//eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Dynamic type parameter for teting
export function AssertPromiseFn<T>(fn: unknown): (arg: T) => Promise<void> {
  if (IsPromiseFn<T>(fn)) return fn
  throw new Error('fn is not a Fn<T>')
}

function IsFetchResponse(_: unknown): _ is globalThis.Response {
  return true
}

export function StubToFetchResponse(stub: unknown): globalThis.Response {
  if (IsFetchResponse(stub)) return stub
  throw new Error('Stub is not Fetch Response')
}
