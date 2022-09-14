import { Injectable } from "@angular/core";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { BehaviorSubject } from "rxjs";

class SocketStatus {
  name: string;
  statusCode: number;
}

enum SocketStatusCodeEnum {
  ON_CONNECTING,
  ON_CONNECTED,
  ON_RECONNECTING,
  ON_RECONNECTED,
  ON_DISCONNECTED,
  ON_ERROR,
}

// DOT REMOVE THIS!!! //
require("@master.technology/websockets");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require("@master.technology/websockets");
// DOT REMOVE THIS!!! //

@Injectable()
export class SubscriptionService {
  private wsc: SubscriptionClient;
  ws: WebSocket;
  status$: BehaviorSubject<SocketStatus> = new BehaviorSubject<SocketStatus>(
    null
  );
  status;

  public get getStatus() {
    return this.status$.asObservable();
  }

  public getWSClient(uri, options, ws) {
    if (this.wsc) {
      return this.wsc;
    }
    if (uri && !this.wsc) {
      this.ws = ws;
      this.wsc = new SubscriptionClient(uri, options, ws);
    }
    if (this.wsc) {
      this.bindEvent();
    }
    return this.wsc;
  }

  public close() {
    if (this.wsc) {
      this.wsc.close();
    }
  }

  private bindEvent() {
    const status = new SocketStatus();

    this.wsc.onConnecting(() => {
      status.name = "Online";
      status.statusCode = SocketStatusCodeEnum.ON_CONNECTING;
      console.log(status);
      this.status$.next(status);
    });
    this.wsc.onConnected(() => {
      status.name = "Online";
      status.statusCode = SocketStatusCodeEnum.ON_CONNECTED;
      this.status = status;
      console.log(status);

      this.status$.next(status);
    });
    this.wsc.onReconnecting(() => {
      status.name = "Reconnecting";
      status.statusCode = SocketStatusCodeEnum.ON_RECONNECTING;
      this.status = status;
      console.log(status);

      this.status$.next(status);
    });
    this.wsc.onReconnected(() => {
      status.name = "Online";
      status.statusCode = SocketStatusCodeEnum.ON_RECONNECTED;
      this.status = status;
      console.log(status);

      this.status$.next(status);
    });
    this.wsc.onDisconnected(() => {
      status.name = "Disconnected";
      status.statusCode = SocketStatusCodeEnum.ON_DISCONNECTED;
      this.status = status;
      console.log(status);

      this.status$.next(status);
    });
    this.wsc.onError(() => {
      status.name = "Error";
      status.statusCode = SocketStatusCodeEnum.ON_ERROR;
      this.status = status;
      console.log(status);

      this.status$.next(status);
    });
  }
}
