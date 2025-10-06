import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import PrivateRoute from "./components/PrivateRoute";
import { LikedSongs } from "./components/LikedSongs";
import { Search } from "./components/Search";

const AppRoutes = [
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/register',
        element: <Register />
    },
    {
        path: '/search',
        element: <Search />
    },
    {
        path: '/',
        element: <PrivateRoute />,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: 'liked-songs',
                element: <LikedSongs />
            }
        ]
    }
];

export default AppRoutes;
