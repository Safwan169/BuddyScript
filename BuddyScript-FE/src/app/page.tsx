import { ProtectedRoute } from "@/components/auth/Protected";
import LeftSideBar from "@/components/Feed/LeftSideBar"
import MiddleLayout from "@/components/Feed/MiddleLayout";
import RightSideBar from "@/components/Feed/RightSideBar";

export default function HomePage() {



  return (

    <ProtectedRoute>
      <div className="container _custom_container ">
        <div className="_layout_inner_wrap">
          <div className="row">

            <LeftSideBar />

            <MiddleLayout />

            <RightSideBar />
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
