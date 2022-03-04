import Pbkdf2 from 'pbkdf2';

export const generateSalt = () => {
  const salt = Pbkdf2.pbkdf2Sync(
    Math.random().toString(),
    Math.random().toString(),
    Math.floor(Math.random() * 30),
    47,
  ).toString('hex');

  return salt;
};

export const hashPassword = (password: string) => {
  const hashedPassword = Pbkdf2.pbkdf2Sync(
    password,
    '..............',
    200,
    64,
  ).toString('hex');

  return hashedPassword;
};
