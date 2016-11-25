export default function Model(ast) {
  return function X() {
    console.log(ast);
  };
}
