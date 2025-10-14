import Index from "./Index";
import Landing from "./Landing";

import { useBaseList } from "@/context/BaseListContext";

const Home = (): JSX.Element => {
  const { isAuthenticated } = useBaseList();

  return isAuthenticated ? <Index /> : <Landing />;
};

export default Home;
