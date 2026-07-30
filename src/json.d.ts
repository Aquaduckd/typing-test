declare module "*.json" {
  const value: {
    name: string;
    noLazyMode?: boolean;
    orderedByFrequency?: boolean;
    words: string[];
  };
  export default value;
}
