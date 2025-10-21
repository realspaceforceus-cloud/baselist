import Feed from "./Feed";
import Landing from "./Landing";

import { useBaseList } from "@/context/BaseListContext";

const Home = (): JSX.Element => {
  const { isAuthenticated } = useBaseList();

  return isAuthenticated ? <Feed /> : <Landing />;
};

export default Home;
