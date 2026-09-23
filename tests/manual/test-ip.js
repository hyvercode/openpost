import ip from 'ip';
console.log(ip.isPrivate('127.0.0.1'));
console.log(ip.isPrivate('192.168.1.1'));
console.log(ip.isPrivate('8.8.8.8'));
console.log(ip.isLoopback('127.0.0.1'));
