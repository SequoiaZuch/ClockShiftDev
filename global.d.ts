declare module '*.txt' {                                                                                                                                                               
  const content: string;                                                                                                                                                               
  export default content;                                                                                                                                                              
}                                                                                                                                                                                      

declare module "*.json" {
  const value: {
    locations: {
      country: string;
      state: string;
      city: string;
    }[];
  };
  export default value;
}                                                                                                                                                                                      
 