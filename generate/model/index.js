export default function generateModel(ast) {
  return function X() {
    console.log(ast);
  };
}
