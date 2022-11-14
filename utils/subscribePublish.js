class SubscribePublish {
  dispatch = {};

  $on(name, fn) {
    if (this.dispatch[name]) {
      this.dispatch[name].push(fn);
    } else {
      this.dispatch[name] = [fn];
    }
  }

  $emit(name, ...arg) {
    if (this.dispatch[name] && this.dispatch[name].length) {
      this.dispatch[name].forEach((fn) => fn(...arg));
    }
  }

  $off(name, fn = "") {
    if (!name) {
      return (this.dispatch = {});
    }
    if (!fn) {
      return (this.dispatch[name] = undefined);
    }

    if (this.dispatch[name] && this.dispatch[name].length) {
      this.dispatch[name].some((fn_item, index) => {
        if (fn === fn_item) {
          this.dispatch[name].splice(index, 1);
          return true;
        }
      });
    }
  }
}

const subscribePublish = new SubscribePublish()

module.exports = subscribePublish