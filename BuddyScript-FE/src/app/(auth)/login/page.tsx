'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type IFormInput, LoginSchema } from '@/schemas/login.schema';
import { useLoginMutation } from '@/features/user/userApi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '@/features/user/userSlice';
import { RootState } from '@/store/store';
import { shouldRedirectAuthPage } from '@/lib/authFlow';

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IFormInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  const router = useRouter();
  const dispatch = useDispatch();
  const { authChecked, isAuthenticated } = useSelector((state: RootState) => state.user);
  const [login] = useLoginMutation();

  useEffect(() => {
    if (shouldRedirectAuthPage({ authChecked, isAuthenticated })) {
      router.replace('/');
    }
  }, [authChecked, isAuthenticated, router]);

  if (!authChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border" role="status" aria-label="Checking session" />
      </div>
    );
  }

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    try {
      const result = await login({ email: data.email, password: data.password }).unwrap();

      dispatch(
        setCredentials({
          user: result.user,
          legacyAccessToken: result.legacyAccessToken,
        })
      );

      toast.success('Login successful');
      reset();
      router.replace('/');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <section className="_social_login_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src="/assets/images/shape1.svg" alt="Decorative shape" className="_shape_img" />
        <img src="/assets/images/dark_shape.svg" alt="Decorative dark shape" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src="/assets/images/shape2.svg" alt="Decorative shape" className="_shape_img" />
        <img
          src="/assets/images/dark_shape1.svg"
          alt="Decorative dark shape"
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_shape_three">
        <img src="/assets/images/shape3.svg" alt="Decorative shape" className="_shape_img" />
        <img
          src="/assets/images/dark_shape2.svg"
          alt="Decorative dark shape"
          className="_dark_shape _dark_shape_opacity"
        />
      </div>

      <div className="_social_login_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_login_left">
                <div className="_social_login_left_image">
                  <img src="/assets/images/login.png" alt="Login Illustration" className="_left_img" />
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <img src="/assets/images/logo.svg" alt="Logo" className="_left_logo" />
                </div>
                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                <h4 className="_social_login_content_title _titl4 _mar_b50">Login to your account</h4>

                <button type="button" className="_social_login_content_btn _mar_b40">
                  <img src="/assets/images/google.svg" alt="Google" className="_google_img" />{' '}
                  <span>Or sign-in with google</span>
                </button>

                <div className="_social_login_content_bottom_txt _mar_b40">
                  <span>Or</span>
                </div>

                <form className="_social_login_form" onSubmit={handleSubmit(onSubmit)}>
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8" htmlFor="email">
                          Email
                        </label>
                        <input
                          type="email"
                          className={`form-control _social_login_input ${errors.email ? 'is-invalid' : ''}`}
                          id="email"
                          {...register('email')}
                          placeholder="Enter your email"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                      </div>
                    </div>

                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8" htmlFor="password">
                          Password
                        </label>
                        <input
                          type="password"
                          className={`form-control _social_login_input ${errors.password ? 'is-invalid' : ''}`}
                          id="password"
                          {...register('password')}
                          placeholder="Enter your password"
                        />
                        {errors.password && (
                          <div className="invalid-feedback">{errors.password.message}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="form-check _social_login_form_check">
                        <input
                          type="checkbox"
                          className="form-check-input _social_login_form_check_input"
                          id="rememberMe"
                          {...register('rememberMe')}
                        />
                        <label
                          className="form-check-label _social_login_form_check_label"
                          htmlFor="rememberMe"
                        >
                          Remember me
                        </label>
                      </div>
                    </div>
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="_social_login_form_left">
                        <p className="_social_login_form_left_para">Forgot password?</p>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_login_form_btn _mar_t40 _mar_b60">
                        <button
                          type="submit"
                          className="_social_login_form_btn_link _btn1"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Logging in...' : 'Login now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">
                        Don&apos;t have an account? <Link href="/register">Create New Account</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
