import Link from 'next/link';
import { useEffect, useState } from 'react';
import { booksApi, categoriesApi } from '../lib/api';

type Book = {
  id: string;
  title: string;
  description: string;
  age: string;
  category: string;
  color: string;
  price: number;
  cover_image: string | null;
  author: string;
};

type Category = {
  id: string;
  name: string;
  cover_url: string | null;
};

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [booksRes, categoriesRes] = await Promise.all([
        booksApi.getAll(),
        categoriesApi.getAll(),
      ]);

      setBooks(booksRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Books By AMA</h1>
          <p className="text-gray-600 mt-2">Children's Story Books</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Categories Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse Categories</h2>
              {categories.length === 0 ? (
                <p className="text-gray-600">No categories yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.id}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                        {category.cover_url ? (
                          <img
                            src={category.cover_url}
                            alt={category.name}
                            className="object-cover w-full h-48"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center text-4xl">
                            📚
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Books Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">New Arrivals</h2>
              {books.length === 0 ? (
                <p className="text-gray-600">No books yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {books.slice(0, 8).map((book) => (
                    <Link
                      key={book.id}
                      href={`/book/${book.id}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-w-2 aspect-h-3 bg-gray-200">
                        {book.cover_image ? (
                          <img
                            src={book.cover_image}
                            alt={book.title}
                            className="object-cover w-full h-64"
                          />
                        ) : (
                          <div className="w-full h-64 flex items-center justify-center text-4xl">
                            📖
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{book.author}</p>
                        <p className="text-lg font-bold text-gray-900 mt-2">
                          ₦{book.price.toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600">
          <p>CNP Bookstore · Magical Stories for Little Minds</p>
        </div>
      </footer>
    </div>
  );
}
