// layouts

import Create from "./pages/Create";
import Explore from "./pages/Explore";
import Vesting from "./pages/Vesting";

// define routes
const Routes = [
  {
    path: "/",
    element: <Explore />,
  },
  {
    path: "/create/:isNative",
    element: <Create />,
  },
  {
    path: "/vesting/:vesting_id",
    element: <Vesting />,
  }
];

export default Routes;
