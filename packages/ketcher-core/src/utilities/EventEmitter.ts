/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

type EventName = string | number | symbol;
type EventListener = (...args: unknown[]) => void;

export class EventEmitter {
  private readonly listeners = new Map<EventName, Set<EventListener>>();

  addListener(eventName: EventName, listener: EventListener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set<EventListener>());
    }

    this.listeners.get(eventName)?.add(listener);
    return this;
  }

  on(eventName: EventName, listener: EventListener) {
    return this.addListener(eventName, listener);
  }

  once(eventName: EventName, listener: EventListener) {
    const onceListener: EventListener = (...args) => {
      this.removeListener(eventName, onceListener);
      listener(...args);
    };

    return this.addListener(eventName, onceListener);
  }

  removeListener(eventName: EventName, listener: EventListener) {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return this;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }

    return this;
  }

  off(eventName: EventName, listener: EventListener) {
    return this.removeListener(eventName, listener);
  }

  emit(eventName: EventName, ...args: unknown[]) {
    const listeners = this.listeners.get(eventName);

    if (!listeners || listeners.size === 0) {
      return false;
    }

    [...listeners].forEach((listener) => listener(...args));
    return true;
  }

  removeAllListeners(eventName?: EventName) {
    if (eventName === undefined) {
      this.listeners.clear();
      return this;
    }

    this.listeners.delete(eventName);
    return this;
  }
}

export default EventEmitter;
